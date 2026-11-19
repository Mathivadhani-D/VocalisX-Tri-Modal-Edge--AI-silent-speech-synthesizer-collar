"""Runs the whole pipeline once (collect -> preprocess -> features -> train/evaluate) and keeps the results in memory."""
from collections import deque
from datetime import datetime, timezone
from threading import RLock

import numpy as np

import visualization
from config import PHRASES, SEED
from dataset import generate_window, load_dataset
from features import features_dataframe
from model import predict_window, train_model
from preprocessing import preprocess


class Engine:
    def __init__(self, scale: float = 1.0, seed: int = SEED):
        self.lock = RLock()          # matplotlib and model swaps are not thread-safe, so they share one lock
        self.latencies = deque(maxlen=200)
        self.build(scale, seed)

    def build(self, scale: float = 1.0, seed: int = SEED):
        with self.lock:
            ds = load_dataset(scale, seed)                                        # 1. data collection
            filtered = np.vstack([preprocess(w) for w in ds.windows])             # 2. preprocessing
            feats = features_dataframe(filtered)                                  # 3. feature extraction
            feats["phrase"] = ds.labels
            self.result = train_model(feats, seed)                                # 4 + 6. classify and evaluate
            self.dataset, self.raw, self.filtered, self.features = ds, ds.windows, filtered, feats
            self.trained_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
            self.plot_cache = {}
            self.latencies.clear()
            self.predict(generate_window(PHRASES[0], np.random.default_rng(seed)))   # warm-up gives a real latency figure

    def predict(self, window) -> dict:
        with self.lock:
            out = predict_window(self.result["pipeline"], window)
            self.latencies.append(out["inference_ms"])
            return out

    def mean_latency_ms(self):
        return round(float(np.mean(self.latencies)), 1) if self.latencies else None

    def plot(self, name: str) -> bytes:
        with self.lock:
            if name not in self.plot_cache:
                self.plot_cache[name] = visualization.render(name, self)
            return self.plot_cache[name]
