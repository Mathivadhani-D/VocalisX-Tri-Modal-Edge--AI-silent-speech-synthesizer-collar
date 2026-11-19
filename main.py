"""VocalisX backend (FastAPI). Run:  uvicorn main:app --reload      Docs: http://127.0.0.1:8000/docs

Pipeline (report modules):  data collection -> preprocessing -> feature extraction -> classification
                            -> output generation -> performance evaluation, plus EDA and visualisation endpoints.
"""
import random
from pathlib import Path
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from itertools import count
from threading import Lock
from typing import Optional

import numpy as np
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

import audio
import eda
import visualization
from config import EMERGENCY_PHRASES, PHRASES, WINDOW_SAMPLES, FS
from dataset import generate_window
from engine import Engine
from preprocessing import preprocess
from features import FEATURE_NAMES, extract_features
from utils import to_py

engine: Optional[Engine] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global engine
    engine = Engine()          # builds the dataset and trains the model once at start-up (a few seconds)
    yield


app = FastAPI(title="VocalisX Backend API", version="2.0.0", lifespan=lifespan,
              description="Silent-speech dashboard backend with a real signal-processing and ML pipeline, EDA and visualisation endpoints.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["null"],                                           # dashboard opened by double-clicking index.html
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",       # Live Server (5500/5501), Vite, etc.
    allow_credentials=False, allow_methods=["*"], allow_headers=["*"],
)

_lock = Lock()
_connected = True
_history: list = []
_ids = count(1)


def eng() -> Engine:
    if engine is None:
        raise HTTPException(503, "Model is still starting up.")
    return engine


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def add_history(phrase: str, confidence: float, event_type: str = "recognition") -> dict:
    with _lock:
        item = {"id": next(_ids), "phrase": phrase, "confidence": round(confidence, 1),
                "event_type": event_type, "timestamp": utc_now().isoformat(timespec="seconds")}
        _history.insert(0, item)
        del _history[100:]
    return item


class ConnectionRequest(BaseModel):
    connected: bool


class RecognitionRequest(BaseModel):
    phrase: Optional[str] = Field(default=None, max_length=160, description="Phrase to simulate. Must be one of the trained phrases. Empty = random.")
    signal: Optional[list[float]] = Field(default=None, max_length=5000, description=f"Raw sEMG window of exactly {WINDOW_SAMPLES} samples ({FS} Hz).")


class EmergencyRequest(BaseModel):
    phrase: str = Field(min_length=1, max_length=160)


class TrainRequest(BaseModel):
    samples_scale: float = Field(default=1.0, ge=0.3, le=3.0, description="Multiplies the number of windows per phrase.")
    seed: int = 42


# ------------------------------------------------------------------ status / device (demo)
@app.get("/")
def root():
    return {"name": "VocalisX Backend API", "status": "running", "docs": "/docs",
            "note": "Signal pipeline and model are real; the dataset is synthetic unless data/emg_windows.csv is provided. No collar hardware is connected."}


@app.get("/api/health")
def health():
    return {"ok": True, "service": "VocalisX Backend API", "model_ready": engine is not None, "timestamp": utc_now().isoformat(timespec="seconds")}


@app.get("/api/status")
def get_status():
    with _lock:
        connected = _connected
    return {"connected": connected, "device_status": "VocalisX Collar Connected" if connected else "VocalisX Collar Disconnected",
            "message": "Demo connection state; it is not a Bluetooth hardware connection."}


@app.post("/api/connection")
def set_connection(payload: ConnectionRequest):
    global _connected
    with _lock:
        _connected = payload.connected
    return get_status()


@app.get("/api/metrics")
def get_metrics():
    e = eng()
    today = utc_now().date().isoformat()
    with _lock:
        connected = _connected
        today_events = sum(1 for h in _history if h["timestamp"].startswith(today))
    return {"recognition_accuracy": round(e.result["test_accuracy"] * 100, 1),     # measured on the held-out test split
            "macro_f1": round(e.result["macro_f1"] * 100, 1),
            "response_time_ms": e.mean_latency_ms(),                              # measured average pipeline time
            "battery_percent": 87,                                                # placeholder: no battery telemetry yet
            "sessions_today": today_events, "connected": connected,
            "dataset_source": e.dataset.source, "demo_data": e.dataset.source == "synthetic"}


@app.get("/api/sensors")
def get_sensors():
    """Sensor-quality bars. Simulated: only the sEMG channel is processed by the pipeline."""
    with _lock:
        connected = _connected
    if not connected:
        vals = dict(semg=0, nir=0, ultrasound=0, imu=0)
    else:
        vals = dict(semg=random.randint(60, 89), nir=64, ultrasound=71, imu=35)
    labels = dict(semg="sEMG Signal", nir="NIR Measurement", ultrasound="Ultrasound", imu="IMU Motion")
    return {"connected": connected, "demo_data": True, "timestamp": utc_now().isoformat(timespec="seconds"),
            "sensors": {k: {"label": labels[k], "value": v} for k, v in vals.items()}}


# ------------------------------------------------------------------ recognition, emergency, history
@app.post("/api/recognize")
def recognize(payload: RecognitionRequest):
    """Raw window -> preprocess -> features -> classifier -> phrase. With no signal, a synthetic window is generated."""
    with _lock:
        connected = _connected
    if not connected:
        raise HTTPException(409, "VocalisX collar is disconnected.")
    e = eng()
    intended = None
    if payload.signal is not None:
        if len(payload.signal) != WINDOW_SAMPLES:
            raise HTTPException(422, f"signal must contain exactly {WINDOW_SAMPLES} samples.")
        window, source = np.asarray(payload.signal, dtype=float), "client_signal"
    else:
        intended = (payload.phrase or "").strip() or random.choice(PHRASES)
        if intended not in PHRASES:
            raise HTTPException(422, f"Model is trained on: {PHRASES}")
        window, source = generate_window(intended, np.random.default_rng()), "simulated_semg"
    out = e.predict(window)
    item = add_history(out["phrase"], out["confidence"], "recognition")
    return {**out, "output_text": out["phrase"], "timestamp": item["timestamp"], "source": source,
            "intended_phrase": intended, "correct": None if intended is None else intended == out["phrase"],
            "demo_data": source == "simulated_semg" or e.dataset.source == "synthetic",
            "message": "Prediction from the trained model. Input is a simulated sEMG window." if source == "simulated_semg" else "Prediction from the supplied signal."}


@app.post("/api/emergency")
def activate_emergency(payload: EmergencyRequest):
    """Logs an emergency phrase. It does not call emergency services."""
    phrase = payload.phrase.strip()
    if not phrase:
        raise HTTPException(422, "Emergency phrase cannot be empty.")
    item = add_history(phrase, 99.0 if phrase in EMERGENCY_PHRASES else 90.0, "emergency")
    return {"activated": True, "phrase": phrase, "timestamp": item["timestamp"], "demo_data": True,
            "message": f"Emergency phrase logged: {phrase}. No call or message was sent."}


@app.get("/api/history")
def get_history(limit: int = Query(10, ge=1, le=100)):
    with _lock:
        items = _history[:limit]
    return {"items": items, "count": len(items)}


@app.delete("/api/history")
def clear_history():
    with _lock:
        _history.clear()
    return {"cleared": True}


# ------------------------------------------------------------------ data exploration
@app.get("/api/dataset/info")
def dataset_info():
    return to_py(eda.dataset_info(eng()))


@app.get("/api/eda/summary")
def eda_summary():
    """Sample count per phrase + imbalance check, amplitude mean/median/variance/std, missing values."""
    return to_py(eda.summary(eng()))


@app.get("/api/eda/statistics")
def eda_statistics():
    """Mean, median, variance, std, min, max, skewness, kurtosis of every extracted feature."""
    return to_py(eda.descriptive_statistics(eng().features))


@app.get("/api/eda/feature/{name}")
def eda_feature(name: str, bins: int = Query(20, ge=5, le=60)):
    """Mean / median / variance / std of ONE feature, overall and per phrase, plus a per-phrase histogram."""
    if name not in FEATURE_NAMES:
        raise HTTPException(404, f"Unknown feature. Available: {FEATURE_NAMES}")
    return to_py(eda.feature_detail(eng().features, name, bins))


@app.get("/api/eda/class-means")
def eda_class_means():
    return to_py(eda.class_means(eng().features))


@app.get("/api/eda/correlations")
def eda_correlations(threshold: float = Query(0.9, ge=0.5, le=1.0)):
    return to_py(eda.correlation_analysis(eng().features, threshold))


@app.get("/api/eda/outliers")
def eda_outliers():
    return to_py(eda.outlier_report(eng().features))


# ------------------------------------------------------------------ model evaluation
@app.get("/api/model/evaluation")
def model_evaluation():
    r = eng().result
    keys = ["best_model", "test_accuracy", "macro_f1", "weighted_f1", "per_class", "classes", "confusion_matrix",
            "comparison", "importance", "n_train", "n_test"]
    return to_py({k: r[k] for k in keys})


@app.post("/api/model/train")
def model_train(payload: TrainRequest):
    e = eng()
    e.build(payload.samples_scale, payload.seed)
    return {"retrained": True, "best_model": e.result["best_model"], "test_accuracy": round(e.result["test_accuracy"], 4), "n_windows": len(e.raw)}


# ------------------------------------------------------------------ visualisation
@app.get("/api/plots")
def list_plots():
    return {"plots": {name: f"/api/plots/{name}" for name in visualization.PLOTS}}


@app.get("/api/plots/{name}")
def get_plot(name: str):
    if name not in visualization.PLOTS:
        raise HTTPException(404, f"Unknown plot. Available: {list(visualization.PLOTS)}")
    return Response(content=eng().plot(name), media_type="image/png")


@app.get("/api/signal/sample")
def signal_sample(phrase: str = Query("Help me")):
    """One raw + filtered window with its features, ready to draw as a waveform in the dashboard."""
    if phrase not in PHRASES:
        raise HTTPException(422, f"phrase must be one of {PHRASES}")
    raw = generate_window(phrase, np.random.default_rng())
    filt = preprocess(raw)
    return to_py({"phrase": phrase, "sampling_rate_hz": FS, "raw": np.round(raw, 4), "filtered": np.round(filt, 4),
                  "features": extract_features(filt), "demo_data": True})


# ------------------------------------------------------------------ optional audio branch
@app.post("/api/audio/features")
async def audio_features_endpoint(file: UploadFile = File(...)):
    """Upload a WAV/FLAC file: returns features before and after DSP speech enhancement."""
    try:
        return to_py(audio.analyse(await file.read()))
    except RuntimeError as exc:
        raise HTTPException(501, str(exc))
    except Exception as exc:
        raise HTTPException(422, f"Could not read audio: {exc}")


# ------------------------------------------------------------------ extras that do not touch the dashboard
HERE = Path(__file__).parent


@app.get("/explorer", include_in_schema=False)
def explorer():
    """Stand-alone data-exploration page (tables + figures). The dashboard does not link to it."""
    return FileResponse(HERE / "explorer.html")


# Optional: serve the existing dashboard folder (../vocalisx) read-only at /app, so one command runs both.
# The dashboard files are not modified and it behaves exactly as it does under Live Server.
FRONTEND_DIR = HERE.parent / "vocalisx"
if FRONTEND_DIR.is_dir():
    app.mount("/app", StaticFiles(directory=FRONTEND_DIR, html=True), name="dashboard")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
