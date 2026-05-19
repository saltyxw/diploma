import pandas as pd
import numpy as np
import joblib

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import GroupKFold, train_test_split
from sklearn.metrics import (
    f1_score,
    accuracy_score,
    classification_report,
    confusion_matrix,
    roc_auc_score
)

from imblearn.over_sampling import SMOTE

df = pd.read_csv("dataset.csv")

FEATURES = ["requestRate", "uniqueEndpoints", "errorRate", "uaLen", "adminHits"]

X = df[FEATURES]
y = df["label"]
groups = df["ip"]

train_ips, test_ips = train_test_split(
    df["ip"].unique(),
    test_size=0.2,
    random_state=42
)

train_df = df[df["ip"].isin(train_ips)]
test_df  = df[df["ip"].isin(test_ips)]

X_train = train_df[FEATURES]
y_train = train_df["label"]
groups_train = train_df["ip"]

X_test = test_df[FEATURES]
y_test = test_df["label"]


gkf = GroupKFold(n_splits=5)

param_grid = {
    "n_estimators": [200, 300],
    "max_depth": [12, 15],
    "min_samples_split": [4, 8],
    "min_samples_leaf": [1, 3],
}

best_params = None
best_f1 = 0
best_threshold = 0.5

total = (
    len(param_grid["n_estimators"]) *
    len(param_grid["max_depth"]) *
    len(param_grid["min_samples_split"]) *
    len(param_grid["min_samples_leaf"])
)

count = 0

for n_estimators in param_grid["n_estimators"]:
    for max_depth in param_grid["max_depth"]:
        for min_samples_split in param_grid["min_samples_split"]:
            for min_samples_leaf in param_grid["min_samples_leaf"]:

                count += 1
                print(f" Progress: {count}/{total}")

                fold_f1 = []
                fold_thresholds = []

                for tr_idx, val_idx in gkf.split(X_train, y_train, groups=groups_train):

                    X_tr, X_val = X_train.iloc[tr_idx], X_train.iloc[val_idx]
                    y_tr, y_val = y_train.iloc[tr_idx], y_train.iloc[val_idx]

                    smote = SMOTE(random_state=42)
                    X_tr_sm, y_tr_sm = smote.fit_resample(X_tr, y_tr)

                    model = RandomForestClassifier(
                        n_estimators=n_estimators,
                        max_depth=max_depth,
                        min_samples_split=min_samples_split,
                        min_samples_leaf=min_samples_leaf,
                        random_state=42,
                        class_weight="balanced",
                        n_jobs=-1
                    )

                    model.fit(X_tr_sm, y_tr_sm)

                    probs = model.predict_proba(X_val)[:, 1]

                    best_fold_f1 = 0
                    best_fold_thr = 0.5

                    for thr in np.arange(0.2, 0.8, 0.05):
                        preds = (probs >= thr).astype(int)
                        f1 = f1_score(y_val, preds)

                        if f1 > best_fold_f1:
                            best_fold_f1 = f1
                            best_fold_thr = thr

                    fold_f1.append(best_fold_f1)
                    fold_thresholds.append(best_fold_thr)

                mean_f1 = np.mean(fold_f1)

                if mean_f1 > best_f1:
                    best_f1 = mean_f1
                    best_threshold = np.mean(fold_thresholds)
                    best_params = {
                        "n_estimators": n_estimators,
                        "max_depth": max_depth,
                        "min_samples_split": min_samples_split,
                        "min_samples_leaf": min_samples_leaf,
                    }

print("\n Best params:", best_params)
print(" Best F1 (CV):", best_f1)
print(" Best threshold:", round(best_threshold, 2))


smote = SMOTE(random_state=42)
X_train_sm, y_train_sm = smote.fit_resample(X_train, y_train)

final_model = RandomForestClassifier(
    **best_params,
    random_state=42,
    class_weight="balanced",
    n_jobs=-1
)

final_model.fit(X_train_sm, y_train_sm)


probs_test = final_model.predict_proba(X_test)[:, 1]
pred_test = (probs_test >= best_threshold).astype(int)

print("\n Confusion Matrix (test):")
print(confusion_matrix(y_test, pred_test))

print("\n Classification Report (test):")
print(classification_report(y_test, pred_test))

print(" Accuracy:", accuracy_score(y_test, pred_test))
print(" ROC AUC:", roc_auc_score(y_test, probs_test))


joblib.dump(
    {
        "model": final_model,
        "threshold": best_threshold,
        "features": FEATURES
    },
    "model.pkl"
)

print(" model saved")
