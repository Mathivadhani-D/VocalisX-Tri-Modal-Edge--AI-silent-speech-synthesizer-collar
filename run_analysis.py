"""Offline report generator for the Data Exploration and Visualisation submission.
Run:  python run_analysis.py      ->  outputs/figures/*.png  and  outputs/eda_report.json"""
import json
from pathlib import Path

import eda
import visualization
from engine import Engine
from utils import to_py

e = Engine()
out = Path("outputs")
(out / "figures").mkdir(parents=True, exist_ok=True)

for name in visualization.PLOTS:
    (out / "figures" / f"{name}.png").write_bytes(e.plot(name))
    print("saved", out / "figures" / f"{name}.png")

report = {"summary": eda.summary(e), "descriptive_statistics": eda.descriptive_statistics(e.features),
          "class_means": eda.class_means(e.features), "correlations": eda.correlation_analysis(e.features),
          "outliers": eda.outlier_report(e.features),
          "evaluation": {k: e.result[k] for k in ("best_model", "test_accuracy", "macro_f1", "per_class", "confusion_matrix", "comparison")}}
(out / "eda_report.json").write_text(json.dumps(to_py(report), indent=2))

cd = report["summary"]["class_distribution"]
print(f"\nDataset: {e.dataset.source}, {len(e.raw)} windows, class imbalance ratio {cd['imbalance_ratio']}")
print(f"Best model: {e.result['best_model']}  accuracy {e.result['test_accuracy']:.1%}  macro-F1 {e.result['macro_f1']:.1%}")
print(f"Windows with extreme outliers: {report['outliers']['windows_with_extreme_outlier']}")
