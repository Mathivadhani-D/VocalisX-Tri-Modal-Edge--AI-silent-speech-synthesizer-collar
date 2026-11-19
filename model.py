"""STAGE 4 - MACHINE-LEARNING CLASSIFICATION and STAGE 6 - PERFORMANCE EVALUATION."""
from time import perf_counter

import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.inspection import permutation_importance
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import StratifiedKFold, cross_validate, train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

from config import SEED
from features import FEATURE_NAMES, extract_features
from preprocessing import preprocess


def _candidates(seed):
    return {
        "Random Forest": RandomForestClassifier(n_estimators=200, class_weight="balanced", random_state=seed),
        "SVM (RBF)": CalibratedClassifierCV(SVC(C=5, class_weight="balanced", random_state=seed), cv=3),
        "k-NN": KNeighborsClassifier(n_neighbors=7),
    }


def train_model(df: pd.DataFrame, seed: int = SEED) -> dict:
    """Compare 3 models with 5-fold CV on the training split, keep the best by macro-F1, then test it once."""
    X, y = df[FEATURE_NAMES], df["phrase"]
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=seed)
    cv = StratifiedKFold(5, shuffle=True, random_state=seed)
    comparison = {}
    for name, est in _candidates(seed).items():
        pipe = Pipeline([("scale", StandardScaler()), ("clf", est)])
        s = cross_validate(pipe, X_tr, y_tr, cv=cv, scoring=["accuracy", "f1_macro"])
        comparison[name] = {"cv_accuracy_mean": s["test_accuracy"].mean(), "cv_accuracy_std": s["test_accuracy"].std(),
                            "cv_f1_macro_mean": s["test_f1_macro"].mean()}
    best = max(comparison, key=lambda k: comparison[k]["cv_f1_macro_mean"])
    pipe = Pipeline([("scale", StandardScaler()), ("clf", _candidates(seed)[best])]).fit(X_tr, y_tr)
    pred = pipe.predict(X_te)
    classes = list(pipe.named_steps["clf"].classes_)
    rep = classification_report(y_te, pred, output_dict=True, zero_division=0)
    imp = permutation_importance(pipe, X_te, y_te, n_repeats=5, random_state=seed, scoring="f1_macro")
    importance = sorted(({"feature": f, "importance": m, "std": s} for f, m, s in
                         zip(FEATURE_NAMES, imp.importances_mean, imp.importances_std)), key=lambda r: -r["importance"])
    return {
        "pipeline": pipe, "classes": classes, "best_model": best, "comparison": comparison,
        "test_accuracy": rep["accuracy"], "macro_f1": rep["macro avg"]["f1-score"], "weighted_f1": rep["weighted avg"]["f1-score"],
        "per_class": {c: {k: rep[c][k] for k in ("precision", "recall", "f1-score", "support")} for c in classes},
        "confusion_matrix": confusion_matrix(y_te, pred, labels=classes).tolist(),
        "importance": importance, "n_train": len(X_tr), "n_test": len(X_te),
    }


def predict_window(pipe, window) -> dict:
    """OUTPUT GENERATION: raw window -> preprocess -> features -> classifier -> phrase + confidence."""
    t0 = perf_counter()
    feats = extract_features(preprocess(window))
    proba = pipe.predict_proba(pd.DataFrame([feats], columns=FEATURE_NAMES))[0]
    classes = pipe.named_steps["clf"].classes_
    order = np.argsort(proba)[::-1]
    return {
        "phrase": str(classes[order[0]]), "confidence": round(float(proba[order[0]]) * 100, 1),
        "top3": [{"phrase": str(classes[i]), "probability": round(float(proba[i]) * 100, 1)} for i in order[:3]],
        "features": {k: float(f"{v:.5g}") for k, v in feats.items()},
        "inference_ms": round((perf_counter() - t0) * 1000, 1),
    }
