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

# Expected proportion of anomalies in historical data
CONTAMINATION = 0.05

# Minimum records needed to train the model
MIN_RECORDS = 30


def detect_anomalies(records: list[dict]) -> list[dict]:
    """
    Fit Isolation Forest on records and annotate each with anomaly_score and is_anomaly.

    anomaly_score: higher = more anomalous (inverted from sklearn's decision_function)
    is_anomaly: True when the model classifies the record as an outlier
    """
    if len(records) < MIN_RECORDS:
        return [
            {**rec, "anomaly_score": 0.0, "is_anomaly": False}
            for rec in records
        ]

    with warnings.catch_warnings():
        warnings.filterwarnings(
            "ignore",
            message=".*ChainedAssignmentError.*",
            category=FutureWarning,
        )

        df = pd.DataFrame(records)

        # Build a standalone numeric frame to avoid chained assignment pitfalls
        # and keep behavior stable with pandas Copy-on-Write in newer versions.
        feature_df = df.loc[:, FEATURES].apply(pd.to_numeric, errors="coerce")

        # Fill missing values with per-column median so the model can still train
        medians = feature_df.median(numeric_only=True)
        feature_filled = feature_df.fillna(medians)

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
