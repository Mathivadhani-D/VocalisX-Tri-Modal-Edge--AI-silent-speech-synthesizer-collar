"""DATA VISUALISATION: every figure returns PNG bytes, served at /api/plots/<name> and saved by run_analysis.py."""
import io
import math

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from scipy.signal import welch
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler

from config import FS
from features import FEATURE_NAMES

COLORS = plt.cm.tab10.colors


def _png(fig) -> bytes:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=110, bbox_inches="tight")
    plt.close(fig)
    return buf.getvalue()


def _rotate(ax):
    plt.setp(ax.get_xticklabels(), rotation=25, ha="right")


def class_distribution(e):
    s = e.features["phrase"].value_counts()
    fig, ax = plt.subplots(figsize=(8, 4.5))
    ax.bar_label(ax.bar(s.index, s.values, color=COLORS[:len(s)]))
    ax.set(title="Samples per phrase (class-balance check)", ylabel="Number of 1-second windows")
    _rotate(ax)
    return _png(fig)


def signal_examples(e):
    classes = sorted(e.features["phrase"].unique())
    rows = math.ceil(len(classes) / 3)
    fig, axes = plt.subplots(rows, 3, figsize=(13, 3 * rows), squeeze=False)
    t = np.arange(e.raw.shape[1]) / FS
    for ax, c in zip(axes.flat, classes):
        i = int(np.flatnonzero(e.features["phrase"].to_numpy() == c)[0])
        ax.plot(t, e.raw[i], color="lightgray", label="raw")
        ax.plot(t, e.filtered[i], color=COLORS[classes.index(c)], lw=0.8, label="filtered")
        ax.set(title=c, xlabel="Time (s)", ylabel="Amplitude (mV)")
    for ax in list(axes.flat)[len(classes):]:
        ax.axis("off")
    axes.flat[0].legend(loc="upper right")
    fig.suptitle("Example sEMG window per phrase: raw vs filtered", y=1.01)
    fig.tight_layout()
    return _png(fig)


def feature_boxplots(e):
    df, classes = e.features, sorted(e.features["phrase"].unique())
    fig, axes = plt.subplots(2, 2, figsize=(13, 8))
    for ax, f in zip(axes.flat, ["rms", "waveform_length", "zero_crossings", "median_freq"]):
        ax.boxplot([df.loc[df["phrase"] == c, f] for c in classes])
        ax.set_xticks(range(1, len(classes) + 1))
        ax.set_xticklabels(classes)
        ax.set_title(f"{f} by phrase")
        _rotate(ax)
    fig.tight_layout()
    return _png(fig)


def feature_histograms(e):
    fig, axes = plt.subplots(2, 3, figsize=(13, 7))
    for ax, f in zip(axes.flat, ["rms", "mav", "variance", "waveform_length", "mean_freq", "total_power"]):
        ax.hist(e.features[f], bins=25, color=COLORS[0], edgecolor="white")
        ax.set(title=f"Distribution of {f}", ylabel="Windows")
    fig.tight_layout()
    return _png(fig)


def correlation_heatmap(e):
    corr = e.features[FEATURE_NAMES].corr().to_numpy()
    fig, ax = plt.subplots(figsize=(10, 8.5))
    im = ax.imshow(corr, vmin=-1, vmax=1, cmap="coolwarm")
    ax.set_xticks(range(len(FEATURE_NAMES)))
    ax.set_yticks(range(len(FEATURE_NAMES)))
    ax.set_xticklabels(FEATURE_NAMES, rotation=60, ha="right")
    ax.set_yticklabels(FEATURE_NAMES)
    fig.colorbar(im, label="Pearson r")
    ax.set_title("Feature correlation matrix")
    return _png(fig)


def psd_by_phrase(e):
    labels = e.features["phrase"].to_numpy()
    fig, ax = plt.subplots(figsize=(9, 5))
    for k, c in enumerate(sorted(set(labels))):
        f, p = welch(e.filtered[labels == c], fs=FS, nperseg=256, axis=-1)
        ax.semilogy(f, p.mean(axis=0), color=COLORS[k], label=c)
    ax.set(title="Mean power spectrum per phrase", xlabel="Frequency (Hz)", ylabel="Power spectral density", xlim=(0, 500))
    ax.legend()
    return _png(fig)


def pca_scatter(e):
    df = e.features
    pca = PCA(2).fit(StandardScaler().fit_transform(df[FEATURE_NAMES]))
    z = pca.transform(StandardScaler().fit_transform(df[FEATURE_NAMES]))
    fig, ax = plt.subplots(figsize=(8, 6))
    for k, c in enumerate(sorted(df["phrase"].unique())):
        m = (df["phrase"] == c).to_numpy()
        ax.scatter(z[m, 0], z[m, 1], s=18, alpha=0.7, color=COLORS[k], label=c)
    ev = pca.explained_variance_ratio_ * 100
    ax.set(title="PCA of features: do the phrases separate?", xlabel=f"PC1 ({ev[0]:.0f}% variance)", ylabel=f"PC2 ({ev[1]:.0f}% variance)")
    ax.legend(fontsize=8)
    return _png(fig)


def confusion_matrix_plot(e):
    cm, classes = np.array(e.result["confusion_matrix"]), e.result["classes"]
    fig, ax = plt.subplots(figsize=(8, 7))
    ax.imshow(cm, cmap="Blues")
    ax.set_xticks(range(len(classes)))
    ax.set_yticks(range(len(classes)))
    ax.set_xticklabels(classes, rotation=35, ha="right")
    ax.set_yticklabels(classes)
    for i in range(len(classes)):
        for j in range(len(classes)):
            ax.text(j, i, cm[i, j], ha="center", va="center", color="white" if cm[i, j] > cm.max() / 2 else "black")
    ax.set(title=f"Confusion matrix ({e.result['best_model']}, accuracy {e.result['test_accuracy']:.1%})", xlabel="Predicted", ylabel="Actual")
    return _png(fig)


def feature_importance(e):
    top = e.result["importance"][:12][::-1]
    fig, ax = plt.subplots(figsize=(8, 5.5))
    ax.barh([r["feature"] for r in top], [r["importance"] for r in top], xerr=[r["std"] for r in top], color=COLORS[2])
    ax.set(title="Permutation feature importance (drop in macro-F1)", xlabel="Importance")
    return _png(fig)


def model_comparison(e):
    names, cmp_ = list(e.result["comparison"]), e.result["comparison"]
    x = np.arange(len(names))
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.bar(x - 0.2, [cmp_[n]["cv_accuracy_mean"] for n in names], 0.4, yerr=[cmp_[n]["cv_accuracy_std"] for n in names], label="CV accuracy", color=COLORS[0])
    ax.bar(x + 0.2, [cmp_[n]["cv_f1_macro_mean"] for n in names], 0.4, label="CV macro-F1", color=COLORS[1])
    ax.set_xticks(x)
    ax.set_xticklabels(names)
    ax.set(title="Model comparison (5-fold cross-validation)", ylim=(0, 1.05))
    ax.legend()
    return _png(fig)


PLOTS = {"class-distribution": class_distribution, "signal-examples": signal_examples, "feature-boxplots": feature_boxplots,
         "feature-histograms": feature_histograms, "correlation-heatmap": correlation_heatmap, "psd-by-phrase": psd_by_phrase,
         "pca-scatter": pca_scatter, "confusion-matrix": confusion_matrix_plot, "feature-importance": feature_importance,
         "model-comparison": model_comparison}


def render(name, e) -> bytes:
    return PLOTS[name](e)
