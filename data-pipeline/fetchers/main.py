"""
One-shot entrypoint for GitHub Actions.
Chạy một lần rồi thoát — không có vòng lặp schedule.
GitHub Actions cron job sẽ gọi script này mỗi giờ.
"""
import datetime
import json
import logging
import os
import sys

import psycopg2
import pandas as pd
from dotenv import load_dotenv

# Resolve processors path regardless of working directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "processors"))
from cleaner import clean, _write_back  # noqa: E402
from Collect_RealTime import main as collect_main  # noqa: E402

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# Only clean data within the rolling window — avoids full-table scan on every run
_CLEAN_WINDOW_DAYS = 30


def _run_cleaner() -> None:
    conn = psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
        dbname=os.environ["DB_NAME"],
    )
    try:
        cutoff = (datetime.date.today() - datetime.timedelta(days=_CLEAN_WINDOW_DAYS)).strftime("%Y-%m-%d")
        logger.info("Loading data from %s onwards for cleaning...", cutoff)
        raw_df = pd.read_sql(
            "SELECT * FROM public.weather_daily WHERE date >= %s ORDER BY city_id, date",
            conn,
            params=(cutoff,),
        )
        if raw_df.empty:
            logger.info("No data in window — skipping cleaner.")
            return

        cleaned_df, report = clean(raw_df)
        updated = _write_back(cleaned_df, conn)
        logger.info(
            "Cleaning complete: %d rows updated, completeness=%.1f%%",
            updated,
            report["completeness_pct"],
        )
        logger.info("Cleaning stats: %s", json.dumps(report["cleaning_stats"]))
    finally:
        conn.close()


if __name__ == "__main__":
    # RUN_MODE controls which stage this invocation runs:
    #   "fetch" — collect only (matrix shards run this, no cleaner to avoid concurrent write-back)
    #   "clean" — cleaner only (single job after all shards finish)
    #   "all"   — both, sequentially (default — local runs / single-shard)
    mode = os.getenv("RUN_MODE", "all")
    if mode not in ("all", "fetch", "clean"):
        raise ValueError(f"Invalid RUN_MODE={mode!r} (expected 'all', 'fetch', or 'clean').")

    if mode in ("all", "fetch"):
        collect_main()
    if mode in ("all", "clean"):
        _run_cleaner()
