"""Shared constants. Change the sampling rate, phrases or sensor bands here."""
from pathlib import Path

FS = 1000                      # sEMG sampling rate (Hz)
WINDOW_S = 1.0                 # one phrase attempt = one 1-second window
WINDOW_SAMPLES = int(FS * WINDOW_S)
SEED = 42

PHRASES = ["Help me", "I need a doctor", "Call an ambulance", "Thank you", "Please help me", "I need assistance"]
EMERGENCY_PHRASES = ["Help me", "Call an ambulance", "I need a doctor"]

# Windows per phrase in the synthetic dataset. Deliberately unbalanced so the class-imbalance check has something to find.
CLASS_COUNTS = {"Help me": 160, "I need a doctor": 140, "Call an ambulance": 120,
                "Thank you": 90, "Please help me": 70, "I need assistance": 50}

# Synthetic muscle-activity "fingerprint" of each phrase (amplitude in mV, carrier frequency in Hz,
# number of muscle bursts, burst width in seconds). Some are close on purpose, so accuracy is not 100%.
PROFILES = {
    "Help me":           dict(amp=1.0,  f0=85,  bursts=3, width=0.09),
    "I need a doctor":   dict(amp=0.6,  f0=150, bursts=4, width=0.06),
    "Call an ambulance": dict(amp=1.5,  f0=115, bursts=2, width=0.17),
    "Thank you":         dict(amp=0.35, f0=65,  bursts=2, width=0.12),
    "Please help me":    dict(amp=0.85, f0=100, bursts=3, width=0.11),   # close to "Help me"
    "I need assistance": dict(amp=0.7,  f0=170, bursts=5, width=0.06),   # close to "I need a doctor"
}

# Frequency bands (Hz) used for band-power features
BANDS = {"20_60": (20, 60), "60_120": (60, 120), "120_250": (120, 250), "250_450": (250, 450)}

DATA_DIR = Path(__file__).parent / "data"
CSV_PATH = DATA_DIR / "emg_windows.csv"   # optional real data: first column = phrase, then WINDOW_SAMPLES values per row
