import warnings

import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

# Features used for anomaly detection
FEATURES = [
    "temperature_2m_max",
    "temperature_2m_min",
    "temperature_2m_mean",
    "rain_sum",
    "wind_speed_10m_max",
    "relative_humidity_2m_mean",
    "cloud_cover_mean",
]

# Expected proportion of anomalies in historical data.
# Raised from 0.05 → 0.08 so Isolation Forest flags ~8 % of training points,
# which means short query ranges are more likely to catch genuine outliers.
CONTAMINATION = 0.08

# Minimum records needed to train the model reliably.
# Previously 30 — lowered to 14 (two calendar weeks) so cities with shorter
# DB history still get scored instead of silent all-False.
MIN_RECORDS = 14

# Anomaly score threshold above which a record is considered anomalous
# when the Isolation Forest model cannot be trained (fallback path).
FALLBACK_SCORE_THRESHOLD = 2.0


def _zscore_fallback(records: list[dict]) -> list[dict]:
    """
    Simple per-feature z-score fallback for when there are too few records
    to train Isolation Forest.  A record is flagged as anomalous if any
    feature deviates more than FALLBACK_SCORE_THRESHOLD standard deviations
    from the mean of the available records.
    """
    if len(records) < 3:
        return [{**r, "anomaly_score": 0.0, "is_anomaly": False} for r in records]

    df = pd.DataFrame(records)
    feature_df = df.loc[:, [f for f in FEATURES if f in df.columns]].apply(
        pd.to_numeric, errors="coerce"
    )
    means = feature_df.mean()
    stds = feature_df.std().replace(0, 1)  # avoid div-by-zero on constant columns
    z_scores = ((feature_df - means) / stds).abs()
    max_z = z_scores.max(axis=1).fillna(0)

    return [
        {
            **records[i],
            "anomaly_score": round(float(max_z.iloc[i]), 4),
            "is_anomaly": bool(max_z.iloc[i] > FALLBACK_SCORE_THRESHOLD),
        }
        for i in range(len(records))
    ]


def detect_anomalies(records: list[dict]) -> list[dict]:
    """
    Fit Isolation Forest on records and annotate each with anomaly_score and is_anomaly.

    anomaly_score: higher = more anomalous (inverted from sklearn's decision_function)
    is_anomaly: True when the model classifies the record as an outlier

    Falls back to z-score method when record count < MIN_RECORDS.
    """
    if len(records) < MIN_RECORDS:
        return _zscore_fallback(records)

    with warnings.catch_warnings():
        warnings.filterwarnings(
            "ignore",
            message=".*ChainedAssignmentError.*",
            category=FutureWarning,
        )

        df = pd.DataFrame(records)

        # Build a standalone numeric frame to avoid chained assignment pitfalls
        available_features = [f for f in FEATURES if f in df.columns]
        feature_df = df.loc[:, available_features].apply(pd.to_numeric, errors="coerce")

        # Fill missing values with per-column median so the model can still train
        medians = feature_df.median(numeric_only=True)
        feature_filled = feature_df.fillna(medians)

        # Drop columns that are still all-NaN after fill (rare edge case)
        feature_filled = feature_filled.dropna(axis=1)

    if feature_filled.empty or feature_filled.shape[1] == 0:
        return _zscore_fallback(records)

    scaler = StandardScaler()
    X = scaler.fit_transform(feature_filled)

    model = IsolationForest(
        contamination=CONTAMINATION,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X)

    # decision_function: lower (more negative) = more anomalous
    # Invert so that higher anomaly_score = more anomalous
    raw_scores = model.decision_function(X)
    predictions = model.predict(X)  # -1 = anomaly, 1 = normal
    anomaly_scores = -raw_scores

    return [
        {
            **records[i],
            "anomaly_score": round(float(anomaly_scores[i]), 4),
            "is_anomaly": bool(predictions[i] == -1),
        }
        for i in range(len(records))
    ]