"""STAGE 2 - PREPROCESSING: remove DC offset, band-pass 20-450 Hz (muscle band), notch out 50 Hz mains hum."""
import numpy as np
from scipy.signal import butter, filtfilt, iirnotch, sosfiltfilt

from config import FS

_SOS = butter(4, [20, 450], btype="band", fs=FS, output="sos")
_NOTCH = iirnotch(50, Q=30, fs=FS)


def preprocess(window) -> np.ndarray:
    x = np.asarray(window, dtype=float)
    x = x - x.mean()
    x = sosfiltfilt(_SOS, x)
    return filtfilt(*_NOTCH, x)
