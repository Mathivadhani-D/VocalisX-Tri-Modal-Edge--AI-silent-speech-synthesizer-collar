"""OPTIONAL audio branch (Librosa, SoundFile, PyAudio, DSP). Libraries are imported defensively so the API runs without them."""
import io

import numpy as np
from scipy.signal import butter, sosfiltfilt

try:
    import soundfile as sf
except ImportError:
    sf = None
try:
    import librosa
except ImportError:
    librosa = None


def libraries() -> dict:
    return {"soundfile": sf is not None, "librosa": librosa is not None}


def read_audio(data: bytes):
    if sf is None:
        raise RuntimeError("SoundFile is not installed (pip install soundfile).")
    y, sr = sf.read(io.BytesIO(data))
    return (y.mean(axis=1) if y.ndim > 1 else y).astype(float), int(sr)


def enhance(y, sr):
    """DSP speech clarity: pre-emphasis (boost high frequencies) then band-pass 80 Hz - 4 kHz (speech band)."""
    y = np.append(y[0], y[1:] - 0.97 * y[:-1])
    return sosfiltfilt(butter(4, [80, min(4000, 0.45 * sr)], btype="band", fs=sr, output="sos"), y)


def audio_features(y, sr) -> dict:
    spec, freqs = np.abs(np.fft.rfft(y)), np.fft.rfftfreq(len(y), 1 / sr)
    out = {"duration_s": round(len(y) / sr, 3), "sample_rate": sr, "rms": float(np.sqrt(np.mean(y ** 2))),
           "zero_crossing_rate": float(np.mean(np.diff(np.sign(y)) != 0)),
           "spectral_centroid_hz": float((freqs * spec).sum() / (spec.sum() + 1e-12))}
    if librosa is not None:
        out["mfcc_mean"] = [round(float(v), 3) for v in librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13).mean(axis=1)]
    return out


def analyse(data: bytes) -> dict:
    y, sr = read_audio(data)
    return {"original": audio_features(y, sr), "enhanced": audio_features(enhance(y, sr), sr), "libraries": libraries()}


def record_microphone(seconds: float = 3, sr: int = 16000):
    """Live capture with PyAudio (needs a microphone and the PortAudio system library). Not used by the API; not tested here."""
    import pyaudio
    pa, stream = pyaudio.PyAudio(), None
    try:
        stream = pa.open(format=pyaudio.paFloat32, channels=1, rate=sr, input=True, frames_per_buffer=1024)
        frames = [stream.read(1024) for _ in range(int(sr / 1024 * seconds))]
        return np.frombuffer(b"".join(frames), dtype=np.float32).astype(float), sr
    finally:
        if stream:
            stream.stop_stream()
            stream.close()
        pa.terminate()
