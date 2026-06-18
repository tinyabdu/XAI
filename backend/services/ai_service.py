import pickle, os, numpy as np, pandas as pd
import shap
import lime.lime_tabular


BASE = os.path.dirname(os.path.dirname(__file__))
FEATURES = ["ip_request_rate","login_attempts","failed_logins","session_duration",
            "pages_visited","request_size_kb","unique_endpoints","time_of_day"]

# Load model and encoder once
with open(os.path.join(BASE, "models", "model.pkl"), "rb") as f:
    MODEL = pickle.load(f)
with open(os.path.join(BASE, "models", "label_encoder.pkl"), "rb") as f:
    LE = pickle.load(f)

# Load training data for LIME background
df_train = pd.read_csv(os.path.join(BASE, "data", "traffic_dataset.csv"))
X_TRAIN = df_train[FEATURES].values

FEATURE_LABELS = {
    "ip_request_rate": "IP Request Rate",
    "login_attempts": "Login Attempts",
    "failed_logins": "Failed Logins",
    "session_duration": "Session Duration (s)",
    "pages_visited": "Pages Visited",
    "request_size_kb": "Request Size (KB)",
    "unique_endpoints": "Unique Endpoints",
    "time_of_day": "Time of Day (hr)",
}

RISK_MAP = {
    "normal": "low",
    "brute_force": "high",
    "ddos": "critical",
    "suspicious": "medium",
}

ACTION_MAP = {
    "normal": "allowed",
    "brute_force": "blocked",
    "ddos": "blocked",
    "suspicious": "flagged",
}


def predict_single(data: dict) -> dict:
    x = np.array([[data[f] for f in FEATURES]])
    pred_enc = MODEL.predict(x)[0]
    proba = MODEL.predict_proba(x)[0]
    label = LE.inverse_transform([pred_enc])[0]
    confidence = round(float(proba[pred_enc]) * 100, 1)

    # SHAP explanation
    explainer = shap.TreeExplainer(MODEL)
    shap_vals = explainer.shap_values(x)
    # shap_vals shape: (n_classes, n_samples, n_features)
    class_idx = pred_enc
    n_classes = len(LE.classes_)
    if isinstance(shap_vals, list):
        sv = shap_vals[class_idx][0]
    elif shap_vals.ndim == 3:
        if shap_vals.shape[0] == n_classes:
            # (n_classes, n_samples, n_features)
            sv = shap_vals[class_idx][0]
        elif shap_vals.shape[-1] == len(FEATURES):
            # (..., ..., n_features) with single output
            sv = shap_vals[0, 0, :]
        else:
            # (n_samples, n_features, n_classes)
            sv = shap_vals[0, :, class_idx]
    else:
        sv = shap_vals[0]
    shap_list = [
        {"feature": FEATURE_LABELS[FEATURES[i]], "value": round(float(sv[i]), 4), "raw": round(float(x[0][i]), 2)}
        for i in range(len(FEATURES))
    ]
    shap_list.sort(key=lambda x: abs(x["value"]), reverse=True)

    # LIME explanation
    lime_exp = _lime_explain(x[0], pred_enc)

    return {
        "label": label,
        "risk": RISK_MAP[label],
        "action": ACTION_MAP[label],
        "confidence": confidence,
        "shap": shap_list,
        "lime": lime_exp,
        "input": {FEATURE_LABELS[k]: round(v, 2) for k, v in data.items() if k in FEATURES},
    }


def _lime_explain(x_instance, pred_class):
    explainer = lime.lime_tabular.LimeTabularExplainer(
        X_TRAIN,
        feature_names=[FEATURE_LABELS[f] for f in FEATURES],
        class_names=list(LE.classes_),
        mode="classification",
        random_state=42,
    )
    exp = explainer.explain_instance(x_instance, MODEL.predict_proba, num_features=6, top_labels=1)
    label_idx = list(exp.available_labels())[0]
    lime_list = [
        {"feature": feat, "weight": round(float(weight), 4)}
        for feat, weight in exp.as_list(label=label_idx)
    ]
    return lime_list


def get_shap_global():
    explainer = shap.TreeExplainer(MODEL)
    shap_vals = explainer.shap_values(X_TRAIN)
    # Mean absolute SHAP across all classes
    if isinstance(shap_vals, list):
        mean_abs = np.mean([np.abs(sv) for sv in shap_vals], axis=0).mean(axis=0)
    else:
        mean_abs = np.abs(shap_vals).reshape(-1, len(FEATURES)).mean(axis=0)
    result = [
        {"feature": FEATURE_LABELS[FEATURES[i]], "importance": round(float(mean_abs[i]), 4)}
        for i in range(len(FEATURES))
    ]
    result.sort(key=lambda x: x["importance"], reverse=True)
    return result
