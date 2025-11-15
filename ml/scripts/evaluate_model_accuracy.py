"""
Comprehensive model accuracy evaluation script
Run with: python ml/scripts/evaluate_model_accuracy.py
"""

import json
import sys
from pathlib import Path
import numpy as np
import pandas as pd
from joblib import load
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report,
)
from sklearn.model_selection import train_test_split

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from train_fever_model import (
    MODEL_PATH,
    METRICS_PATH,
    NUMERIC_FEATURES,
    BOOLEAN_FEATURES,
    CATEGORICAL_FEATURES,
    derive_features,
    build_model,
    DEFAULT_DATASET,
)

LABEL_MAP = {
    0: "No Fever",
    1: "Low Fever",
    2: "Moderate Fever",
    3: "High Fever",
}


def load_existing_metrics():
    """Load metrics from the saved metrics file"""
    if METRICS_PATH.exists():
        with open(METRICS_PATH, "r") as f:
            return json.load(f)
    return None


def evaluate_on_test_set(test_size=0.2, random_state=42):
    """Evaluate model on a held-out test set"""
    print("\n" + "=" * 60)
    print("📊 EVALUATING MODEL ON TEST SET")
    print("=" * 60)

    # Load dataset
    if not DEFAULT_DATASET.exists():
        print(f"❌ Dataset not found at {DEFAULT_DATASET}")
        return None

    df = pd.read_csv(DEFAULT_DATASET)
    df = derive_features(df)

    target = df["label"]
    features = df.drop(columns=["label"])

    # Split into train and test
    X_train, X_test, y_train, y_test = train_test_split(
        features, target, test_size=test_size, random_state=random_state, stratify=target
    )

    print(f"\n📦 Dataset Info:")
    print(f"   Total samples: {len(df)}")
    print(f"   Training samples: {len(X_train)}")
    print(f"   Test samples: {len(X_test)}")
    print(f"   Features: {len(features.columns)}")

    # Load existing model
    if not MODEL_PATH.exists():
        print(f"\n❌ Model not found at {MODEL_PATH}")
        print("   Run training first or the model will auto-train on first prediction")
        return None

    print(f"\n🔍 Loading model from: {MODEL_PATH}")
    model = load(MODEL_PATH)

    # Make predictions
    print("\n⏳ Making predictions on test set...")
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)

    # Calculate metrics
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average="macro", zero_division=0)
    recall = recall_score(y_test, y_pred, average="macro", zero_division=0)
    f1 = f1_score(y_test, y_pred, average="macro", zero_division=0)

    try:
        roc_auc = roc_auc_score(y_test, y_pred_proba, multi_class="ovr", average="macro")
    except Exception as e:
        roc_auc = None
        print(f"   Warning: Could not calculate ROC-AUC: {e}")

    # Per-class metrics
    precision_per_class = precision_score(y_test, y_pred, average=None, zero_division=0)
    recall_per_class = recall_score(y_test, y_pred, average=None, zero_division=0)
    f1_per_class = f1_score(y_test, y_pred, average=None, zero_division=0)

    # Confusion matrix
    cm = confusion_matrix(y_test, y_pred)

    # Display results
    print("\n" + "=" * 60)
    print("📈 OVERALL METRICS")
    print("=" * 60)
    print(f"\n✅ Accuracy:        {accuracy * 100:.2f}%")
    print(f"📊 Precision:       {precision * 100:.2f}% (macro average)")
    print(f"🔍 Recall:          {recall * 100:.2f}% (macro average)")
    print(f"⚖️  F1-Score:        {f1 * 100:.2f}% (macro average)")
    if roc_auc:
        print(f"📈 ROC-AUC:         {roc_auc * 100:.2f}%")

    print("\n" + "=" * 60)
    print("📋 PER-CLASS METRICS")
    print("=" * 60)
    print(f"\n{'Class':<20} {'Precision':<12} {'Recall':<12} {'F1-Score':<12}")
    print("-" * 60)
    for i, label_name in LABEL_MAP.items():
        if i < len(precision_per_class):
            print(
                f"{label_name:<20} {precision_per_class[i]*100:>10.2f}% {recall_per_class[i]*100:>10.2f}% {f1_per_class[i]*100:>10.2f}%"
            )

    print("\n" + "=" * 60)
    print("🔢 CONFUSION MATRIX")
    print("=" * 60)
    print("\nPredicted →")
    print("Actual ↓", end="")
    for label_name in LABEL_MAP.values():
        print(f"{label_name[:8]:>12}", end="")
    print()

    for i, label_name in enumerate(LABEL_MAP.values()):
        print(f"{label_name[:8]:<12}", end="")
        for j in range(len(LABEL_MAP)):
            if i < cm.shape[0] and j < cm.shape[1]:
                print(f"{cm[i, j]:>12}", end="")
            else:
                print(f"{'0':>12}", end="")
        print()

    # Classification report
    print("\n" + "=" * 60)
    print("📄 DETAILED CLASSIFICATION REPORT")
    print("=" * 60)
    print("\n" + classification_report(y_test, y_pred, target_names=list(LABEL_MAP.values())))

    # Class distribution
    print("\n" + "=" * 60)
    print("📊 CLASS DISTRIBUTION IN TEST SET")
    print("=" * 60)
    test_dist = pd.Series(y_test).value_counts().sort_index()
    print("\nClass distribution:")
    for i, label_name in LABEL_MAP.items():
        count = test_dist.get(i, 0)
        pct = (count / len(y_test)) * 100 if len(y_test) > 0 else 0
        print(f"  {label_name:<20} {count:>5} samples ({pct:>5.1f}%)")

    return {
        "accuracy": float(accuracy),
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1),
        "roc_auc": float(roc_auc) if roc_auc else None,
        "per_class": {
            "precision": [float(x) for x in precision_per_class],
            "recall": [float(x) for x in recall_per_class],
            "f1": [float(x) for x in f1_per_class],
        },
        "confusion_matrix": cm.tolist(),
        "test_samples": len(X_test),
        "train_samples": len(X_train),
    }


def show_existing_metrics():
    """Display metrics from the saved metrics file"""
    print("\n" + "=" * 60)
    print("📁 EXISTING MODEL METRICS (from training)")
    print("=" * 60)

    metrics_data = load_existing_metrics()
    if not metrics_data:
        print("\n❌ No saved metrics found")
        print(f"   Expected at: {METRICS_PATH}")
        return

    print(f"\n📅 Trained at: {metrics_data.get('trained_at', 'Unknown')}")
    print(f"📂 Dataset: {Path(metrics_data.get('dataset', 'Unknown')).name}")

    if "metrics" in metrics_data:
        m = metrics_data["metrics"]
        print("\n📈 Cross-Validation Metrics (5-fold):")
        print(f"   ✅ Accuracy:  {m.get('accuracy', 0) * 100:.2f}%")
        print(f"   📊 Precision: {m.get('precision', 0) * 100:.2f}%")
        print(f"   🔍 Recall:    {m.get('recall', 0) * 100:.2f}%")
        print(f"   ⚖️  F1-Score:  {m.get('f1', 0) * 100:.2f}%")
        if m.get("roc_auc"):
            print(f"   📈 ROC-AUC:   {m.get('roc_auc', 0) * 100:.2f}%")
    else:
        print("\n⚠️  No metrics found in saved file")


def main():
    print("=" * 60)
    print("🎯 FEVER MODEL ACCURACY EVALUATION")
    print("=" * 60)

    # Show existing metrics
    show_existing_metrics()

    # Evaluate on test set
    test_metrics = evaluate_on_test_set()

    # Summary
    print("\n" + "=" * 60)
    print("📝 SUMMARY")
    print("=" * 60)

    if test_metrics:
        print(f"\n✅ Model Accuracy: {test_metrics['accuracy'] * 100:.2f}%")
        print(f"   Tested on {test_metrics['test_samples']} samples")
        print(f"\n💡 Interpretation:")
        accuracy = test_metrics["accuracy"]
        if accuracy >= 0.95:
            print("   🟢 Excellent! Model has very high accuracy")
        elif accuracy >= 0.85:
            print("   🟡 Good accuracy, but could be improved")
        elif accuracy >= 0.70:
            print("   🟠 Moderate accuracy, consider retraining with more data")
        else:
            print("   🔴 Low accuracy, model needs improvement")

        # Save evaluation results
        eval_path = MODEL_PATH.parent / "fever_model_evaluation.json"
        with open(eval_path, "w") as f:
            json.dump(test_metrics, f, indent=2)
        print(f"\n💾 Evaluation results saved to: {eval_path}")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)








