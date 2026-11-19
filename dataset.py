"""STAGE 1 - DATA COLLECTION.
Real recordings are loaded from data/emg_windows.csv if that file exists.
Otherwise a synthetic sEMG dataset is generated (clearly labelled as source='synthetic')."""
from dataclasses import dataclass

import numpy as np
import pandas as pd
from scipy.signal import butter, sosfiltfilt

from config import BANDS, CLASS_COUNTS, CSV_PATH, FS, PROFILES, SEED, WINDOW_SAMPLES


@dataclass
class Dataset:
    windows: np.ndarray   # (n_windows, WINDOW_SAMPLES) raw signal
    labels: np.ndarray    # (n_windows,) phrase text
    source: str           # "synthetic" or "csv:<file>"


def generate_window(phrase: str, rng: np.random.Generator) -> np.ndarray:
    """One synthetic 1-second sEMG window: band-limited noise x muscle-burst envelope + realistic contamination."""
    p = PROFILES[phrase]
    n, t = WINDOW_SAMPLES, np.arange(WINDOW_SAMPLES) / FS
    f0 = max(45.0, rng.normal(p["f0"], 10))
    amp = p["amp"] * rng.lognormal(0, 0.18)
    carrier = sosfiltfilt(butter(4, [max(20, f0 - 35), min(450, f0 + 35)], btype="band", fs=FS, output="sos"),
                          rng.normal(0, 1, n))
    carrier /= carrier.std()
    envelope = np.zeros(n)
    for c in rng.uniform(0.1, 0.9, max(1, p["bursts"] + (rng.integers(-1, 2) if rng.random() < 0.3 else 0))):
        envelope += np.exp(-0.5 * ((t - c) / (p["width"] * rng.uniform(0.8, 1.2))) ** 2)
    x = 0.5 * amp * carrier * np.clip(envelope, 0, 1.5)
    x += rng.normal(0, 0.03, n)                                          # sensor noise
    x += 0.05 * np.sin(2 * np.pi * rng.uniform(0.5, 2) * t + rng.uniform(0, 6.28))   # baseline wander
    x += 0.02 * np.sin(2 * np.pi * 50 * t + rng.uniform(0, 6.28))        # 50 Hz mains hum
    if rng.random() < 0.03:                                              # occasional motion artefact (an outlier)
        i = rng.integers(50, n - 50)
        x[i:i + rng.integers(3, 10)] += rng.choice([-1, 1]) * rng.uniform(2, 4)
    return x


def generate_dataset(scale: float = 1.0, seed: int = SEED) -> Dataset:
    rng = np.random.default_rng(seed)
    windows, labels = [], []
    for phrase, count in CLASS_COUNTS.items():
        for _ in range(max(10, int(count * scale))):
            windows.append(generate_window(phrase, rng))
            labels.append(phrase)
    order = rng.permutation(len(labels))
    return Dataset(np.asarray(windows)[order], np.asarray(labels)[order], "synthetic")


def load_windows_csv(path) -> Dataset:
    df = pd.read_csv(path)
    labels, data = df.iloc[:, 0].astype(str).to_numpy(), df.iloc[:, 1:].to_numpy(dtype=float)
    if data.shape[1] != WINDOW_SAMPLES:
        raise ValueError(f"CSV rows need {WINDOW_SAMPLES} samples, found {data.shape[1]}")
    return Dataset(data, labels, f"csv:{path.name}")


def load_dataset(scale: float = 1.0, seed: int = SEED) -> Dataset:
    return load_windows_csv(CSV_PATH) if CSV_PATH.exists() else generate_dataset(scale, seed)
