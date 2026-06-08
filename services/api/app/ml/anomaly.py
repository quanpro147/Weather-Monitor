import warnings

import numpy as np
import pandas as pd
from sklearn.decomposition import PCA
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


def _pca_coords(X: np.ndarray) -> np.ndarray | None:
    """
    Project a standardized feature matrix down to 2 components for visualization.

    The Isolation Forest decides in the full N-dimensional FEATURES space, so a
    2-feature scatter (e.g. temp vs humidity) can show an outlier sitting in the
    middle of the normal cloud. PCA projects that same N-D space onto the two
    directions of greatest variance, so flagged points naturally fall to the
    edges — keeping the picture consistent with the model's judgment.

    Returns an (n_samples, 2) array, or None when there isn't enough data.
    """
    n_samples, n_features = X.shape
    n_components = min(2, n_features, n_samples)
    if n_components < 1:
        return None

    coords = PCA(n_components=n_components, random_state=42).fit_transform(X)
    # Always hand back two columns so callers can index pc1/pc2 unconditionally.
    if coords.shape[1] == 1:
        coords = np.hstack([coords, np.zeros((n_samples, 1))])
    return coords


def _zscore_fallback(records: list[dict]) -> list[dict]:
    """
    Simple per-feature z-score fallback for when there are too few records
    to train Isolation Forest.  A record is flagged as anomalous if any
    feature deviates more than FALLBACK_SCORE_THRESHOLD standard deviations
    from the mean of the available records.
    """
    if len(records) < 3:
        return [
            {**r, "anomaly_score": 0.0, "is_anomaly": False, "pc1": None, "pc2": None}
            for r in records
        ]

    df = pd.DataFrame(records)
    feature_df = df.loc[:, [f for f in FEATURES if f in df.columns]].apply(
        pd.to_numeric, errors="coerce"
    )
    means = feature_df.mean()
    stds = feature_df.std().replace(0, 1)  # avoid div-by-zero on constant columns
    signed_z = (feature_df - means) / stds
    max_z = signed_z.abs().max(axis=1).fillna(0)

    # Reuse the standardized matrix for the 2-D projection (same space as scoring).
    coords = _pca_coords(signed_z.fillna(0.0).to_numpy())

    return [
        {
            **records[i],
            "anomaly_score": round(float(max_z.iloc[i]), 4),
            "is_anomaly": bool(max_z.iloc[i] > FALLBACK_SCORE_THRESHOLD),
            "pc1": round(float(coords[i, 0]), 4) if coords is not None else None,
            "pc2": round(float(coords[i, 1]), 4) if coords is not None else None,
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

    # 2-D projection of the SAME scaled matrix the model scored, for the scatter plot.
    coords = _pca_coords(X)

    return [
        {
            **records[i],
            "anomaly_score": round(float(anomaly_scores[i]), 4),
            "is_anomaly": bool(predictions[i] == -1),
            "pc1": round(float(coords[i, 0]), 4) if coords is not None else None,
            "pc2": round(float(coords[i, 1]), 4) if coords is not None else None,
        }
        for i in range(len(records))
    ]