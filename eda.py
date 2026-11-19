"""EXPLORATORY DATA ANALYSIS (report section 5.3): class balance, descriptive statistics, relationships, outliers."""
import numpy as np
import pandas as pd

from features import FEATURE_NAMES

KEY_FEATURES = ["rms", "mav", "waveform_length", "zero_crossings", "mean_freq", "median_freq"]


def _basic(x) -> dict:
    x = np.asarray(x, dtype=float)
    return {"mean": x.mean(), "median": np.median(x), "variance": x.var(), "std": x.std(), "min": x.min(), "max": x.max()}
def dataset_info(e) -> dict:
    return {"source": e.dataset.source, "is_synthetic": e.dataset.source == "synthetic", "n_windows": len(e.raw),
            "n_features": len(FEATURE_NAMES), "feature_names": FEATURE_NAMES,
            "sampling_rate_hz": 1000, "window_seconds": e.raw.shape[1] / 1000, "trained_at": e.trained_at}
def class_distribution(labels) -> dict:
    s = pd.Series(labels).value_counts()
    ratio = s.max() / s.min()
    return {"counts": s.to_dict(), "percent": (s / s.sum() * 100).round(1).to_dict(), "imbalance_ratio": round(ratio, 2),
            "majority_class": s.idxmax(), "minority_class": s.idxmin(), "is_imbalanced": bool(ratio > 1.5),
            "handled_by": "class_weight='balanced' (Random Forest, SVM) and stratified train/test split"}
def amplitude_statistics(raw, labels) -> dict:
    """Mean / median / variance / standard deviation of the raw signal values, overall and per phrase."""
    labels = np.asarray(labels)
    return {"overall": _basic(raw.ravel()), "per_phrase": {c: _basic(raw[labels == c].ravel()) for c in sorted(set(labels))}}
def descriptive_statistics(df) -> dict:
    f = df[FEATURE_NAMES]
    return pd.DataFrame({"mean": f.mean(), "median": f.median(), "variance": f.var(), "std": f.std(), "min": f.min(),
                         "max": f.max(), "skewness": f.skew(), "kurtosis": f.kurt()}).to_dict(orient="index")
def class_means(df) -> dict:
    return df.groupby("phrase")[KEY_FEATURES].mean().to_dict(orient="index")


def missing_values(df) -> dict:
    m = df[FEATURE_NAMES].isna().sum()
    return {"total_missing": int(m.sum()), "by_feature": m.to_dict()}


def correlation_analysis(df, threshold: float = 0.9) -> dict:
    corr = df[FEATURE_NAMES].corr()
    pairs = [{"a": a, "b": b, "r": corr.loc[a, b]} for i, a in enumerate(FEATURE_NAMES) for b in FEATURE_NAMES[i + 1:]
             if abs(corr.loc[a, b]) >= threshold]
    return {"threshold": threshold, "highly_correlated_pairs": sorted(pairs, key=lambda p: -abs(p["r"])),
            "matrix": corr.to_dict(orient="index")}


def outlier_report(df) -> dict:
    """IQR rule applied WITHIN each phrase (loud phrases are not outliers just because other phrases are quiet).
    Mild = beyond 1.5 x IQR, extreme = beyond 3 x IQR (typically motion artefacts or a bad electrode contact)."""
    g = df.groupby("phrase")[FEATURE_NAMES]
    q1, q3 = g.transform(lambda s: s.quantile(0.25)), g.transform(lambda s: s.quantile(0.75))
    iqr, f = q3 - q1, df[FEATURE_NAMES]
    mild = ((f < q1 - 1.5 * iqr) | (f > q3 + 1.5 * iqr)).sum()
    extreme_mask = (f < q1 - 3 * iqr) | (f > q3 + 3 * iqr)
    rows = extreme_mask.any(axis=1)
    return {"method": "IQR within each phrase", "mild_outliers_by_feature": mild.to_dict(),
            "extreme_outliers_by_feature": extreme_mask.sum().to_dict(),
            "windows_with_extreme_outlier": int(rows.sum()), "percent_of_windows": round(rows.mean() * 100, 1),
            "extreme_windows_by_phrase": df.loc[rows, "phrase"].value_counts().to_dict(),
            "example_window_indices": [int(i) for i in np.flatnonzero(rows)[:20]]}


def feature_detail(df, name: str, bins: int = 20) -> dict:
    """One feature in depth: overall and per-phrase mean / median / variance / std, plus a histogram split by phrase
    (shared bin edges, so the dashboard can draw stacked bars and show whether the phrases separate)."""
    x = df[name].to_numpy(dtype=float)
    edges = np.histogram_bin_edges(x, bins=bins)
    per = {}
    hist = {}
    for c in sorted(df["phrase"].unique()):
        v = df.loc[df["phrase"] == c, name].to_numpy(dtype=float)
        per[c] = _basic(v)
        hist[c] = np.histogram(v, bins=edges)[0].tolist()
    return {"feature": name, "overall": _basic(x), "per_phrase": per, "bin_edges": edges.tolist(), "histogram_by_phrase": hist}


def summary(e) -> dict:
    return {"dataset": dataset_info(e), "class_distribution": class_distribution(e.features["phrase"]),
            "amplitude_statistics": amplitude_statistics(e.raw, e.features["phrase"]),
            "missing_values": missing_values(e.features)}
