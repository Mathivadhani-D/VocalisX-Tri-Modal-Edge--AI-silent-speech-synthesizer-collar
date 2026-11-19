import math
import numpy as np
import pandas as pd


def to_py(o):
    """Convert numpy/pandas values into plain JSON-safe Python (NaN -> None, 6 significant digits)."""
    if isinstance(o, dict):
        return {str(k): to_py(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [to_py(v) for v in o]
    if isinstance(o, np.ndarray):
        return to_py(o.tolist())
    if isinstance(o, pd.DataFrame):
        return to_py(o.to_dict(orient="records"))
    if isinstance(o, pd.Series):
        return to_py(o.to_dict())
    if isinstance(o, np.bool_):
        return bool(o)
    if isinstance(o, np.integer):
        return int(o)
    if isinstance(o, (np.floating, float)):
        v = float(o)
        return None if math.isnan(v) or math.isinf(v) else float(f"{v:.6g}")
    return o
