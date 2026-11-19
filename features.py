"""STAGE 3 - FEATURE EXTRACTION: time-domain and frequency-domain features from one filtered sEMG window."""
import numpy as np
import pandas as pd
from scipy.signal import welch
from scipy.stats import kurtosis, skew

from config import BANDS, FS, WINDOW_SAMPLES


def extract_features(x, fs: int = FS) -> dict:
    x = np.asarray(x, dtype=float)
    d, ax = np.diff(x), np.abs(x)
    thr = 0.05 * x.std()                                   # ignore tiny noise wiggles around zero
    f, p = welch(x, fs=fs, nperseg=256)
    total = p.sum() + 1e-12
    cum = np.cumsum(p) / total
    feats = {
        # time domain
        "mean": x.mean(), "variance": x.var(), "std": x.std(),
        "rms": np.sqrt(np.mean(x ** 2)), "mav": ax.mean(),
        "zero_crossings": np.sum((x[:-1] * x[1:] < 0) & (np.abs(d) > thr)),
        "slope_sign_changes": np.sum((d[:-1] * d[1:] < 0) & ((np.abs(d[:-1]) > thr) | (np.abs(d[1:]) > thr))),
        "waveform_length": np.abs(d).sum(), "peak_amplitude": ax.max(),
        "skewness": skew(x), "kurtosis": kurtosis(x),
    }
    # frequency domain: share of power in each band, plus summary frequencies
    for name, (lo, hi) in BANDS.items():
        feats[f"bp_{name}"] = p[(f >= lo) & (f < hi)].sum() / total
    feats.update(total_power=total, mean_freq=(f * p).sum() / total,
                 median_freq=f[min(np.searchsorted(cum, 0.5), len(f) - 1)], peak_freq=f[p.argmax()])
    return {k: float(v) for k, v in feats.items()}


FEATURE_NAMES = list(extract_features(np.random.default_rng(0).normal(size=WINDOW_SAMPLES)).keys())


def features_dataframe(filtered_windows) -> pd.DataFrame:
    return pd.DataFrame([extract_features(w) for w in filtered_windows], columns=FEATURE_NAMES)
