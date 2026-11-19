# VocalisX project layout

```
vocalisx/            your dashboard, now with a Data Analysis page (analysis.js) fed by this backend
vocalisx_backend/    FastAPI backend v2 (this folder)
```
The dashboard's original pages still keep their data in the browser. Only the new **Analysis** tab calls this backend, so start the
backend first (or the tab shows a 'Backend not reachable' message). Open the dashboard with Live Server, by double-clicking
`index.html`, or at http://127.0.0.1:8000/app/ .

**Analysis tab = report section 5.3 in the dashboard:** Overview (sample counts, imbalance, missing values, outliers), Statistics
(mean / median / variance / std of the raw signal and of all 19 features), Feature explorer (pick a feature, see stats per phrase and a
stacked histogram), Signal (raw vs filtered waveform, features, live recognition), Relations & outliers, Figures (all 10 plots), Model.

Backend: `cd vocalisx_backend`, `pip install -r requirements.txt`, `uvicorn main:app --reload`, then open
- http://127.0.0.1:8000/docs      all endpoints, try them in the browser
- http://127.0.0.1:8000/explorer  data-exploration page: statistics tables and all figures
- http://127.0.0.1:8000/app/      the same dashboard served read-only from `../vocalisx` (optional convenience)

---

# VocalisX backend v2 (FastAPI + scikit-learn)

Refined version of the demo API. The recognition result now comes from a real signal-processing and
machine-learning pipeline instead of a random choice.

## Run
```
pip install -r requirements.txt
uvicorn main:app --reload          # API + docs at http://127.0.0.1:8000/docs
python run_analysis.py             # saves every figure and the EDA report to outputs/ (for your report)
python smoke_test.py               # calls every endpoint once
```
Start-up takes about 6 seconds because the dataset is generated and the models are trained once.

## Pipeline = your report modules
| Report module | File | What it does |
|---|---|---|
| Data collection | `dataset.py` | Synthetic sEMG windows (1 s at 1000 Hz, 6 phrases, deliberately unbalanced, with noise, 50 Hz hum and motion artefacts). Loads `data/emg_windows.csv` instead if present. |
| Preprocessing | `preprocessing.py` | DC removal, 20-450 Hz band-pass, 50 Hz notch (SciPy). |
| Feature extraction | `features.py` | 19 features: mean, variance, std, RMS, MAV, zero crossings, slope sign changes, waveform length, peak, skewness, kurtosis, 4 band powers, total power, mean / median / peak frequency. |
| ML classification | `model.py` | Random Forest vs SVM vs k-NN compared by 5-fold CV; best by macro-F1 is kept. |
| Output generation | `model.predict_window` | Phrase, confidence, top-3, features, latency. |
| Performance evaluation | `model.train_model` | Hold-out accuracy, macro-F1, per-class precision / recall, confusion matrix, permutation feature importance. |
| EDA (section 5.3) | `eda.py` | Class counts and imbalance ratio, mean / median / variance / std, feature relationships, outliers, missing values. |
| Visualisation | `visualization.py` | 10 figures (see below). |
| Audio branch (optional) | `audio.py` | SoundFile + Librosa MFCC, DSP speech enhancement, PyAudio recording helper. |

## Endpoints
Original (kept): `/api/health`, `/api/status`, `POST /api/connection`, `/api/metrics`, `/api/sensors`,
`POST /api/recognize`, `POST /api/emergency`, `GET|DELETE /api/history`.

New:
- `GET /api/eda/feature/{name}` (one feature: overall + per-phrase mean/median/variance/std and a per-phrase histogram)
- `GET /api/dataset/info`, `/api/eda/summary`, `/api/eda/statistics`, `/api/eda/class-means`, `/api/eda/correlations?threshold=0.9`, `/api/eda/outliers`
- `GET /api/model/evaluation`, `POST /api/model/train {"samples_scale":1.0,"seed":42}`
- `GET /api/plots` then `GET /api/plots/<name>` (PNG): class-distribution, signal-examples, feature-boxplots, feature-histograms, correlation-heatmap, psd-by-phrase, pca-scatter, confusion-matrix, feature-importance, model-comparison
- `GET /api/signal/sample?phrase=Help me` (raw + filtered waveform to draw in the dashboard)
- `POST /api/audio/features` (upload a WAV)

`POST /api/recognize` accepts `{"phrase": "Help me"}` (simulates that phrase, then classifies it, so `correct` can be false)
or `{"signal": [1000 numbers]}` for a real window.

## Using real data
Create `data/emg_windows.csv`: first column = phrase text, then 1000 sample values per row (1 s at 1000 Hz).
Restart the server; `/api/dataset/info` will show `source: csv:...`. Change `PHRASES` in `config.py` to match your labels.

## Important honesty notes
- The accuracy figures describe the synthetic data generator, not a real collar. Report them as "on a synthetic dataset".
- `battery_percent` and the NIR / ultrasound / IMU bars are still placeholders. Only the sEMG channel is processed.
- Emergency endpoints only log. History is in memory and clears on restart.
- `audio.record_microphone` (PyAudio) is not exercised by the API.
