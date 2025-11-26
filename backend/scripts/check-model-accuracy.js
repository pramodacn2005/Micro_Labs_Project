/**
 * Quick script to check model accuracy from saved metrics
 * Run with: node backend/scripts/check-model-accuracy.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const metricsPath = path.resolve(__dirname, "..", "models", "fever_model_metrics.json");

function checkAccuracy() {
  console.log("=".repeat(60));
  console.log("🎯 FEVER MODEL ACCURACY CHECK");
  console.log("=".repeat(60));

  if (!fs.existsSync(metricsPath)) {
    console.log("\n❌ Metrics file not found!");
    console.log(`   Expected at: ${metricsPath}`);
    console.log("\n💡 The model will be trained automatically on first use.");
    console.log("   After training, metrics will be saved here.");
    return;
  }

  try {
    const metricsData = JSON.parse(fs.readFileSync(metricsPath, "utf8"));

    console.log("\n📁 Model Information:");
    console.log(`   Trained at: ${metricsData.trained_at || "Unknown"}`);
    if (metricsData.dataset) {
      const datasetName = path.basename(metricsData.dataset);
      console.log(`   Dataset: ${datasetName}`);
    }

    if (metricsData.metrics) {
      const m = metricsData.metrics;
      console.log("\n📈 Model Performance Metrics:");
      console.log("   (Based on 5-fold cross-validation during training)");
      console.log("\n" + "─".repeat(60));
      console.log(`   ✅ Accuracy:  ${(m.accuracy * 100).toFixed(2)}%`);
      console.log(`   📊 Precision: ${(m.precision * 100).toFixed(2)}% (macro average)`);
      console.log(`   🔍 Recall:    ${(m.recall * 100).toFixed(2)}% (macro average)`);
      console.log(`   ⚖️  F1-Score:  ${(m.f1 * 100).toFixed(2)}% (macro average)`);
      if (m.roc_auc) {
        console.log(`   📈 ROC-AUC:   ${(m.roc_auc * 100).toFixed(2)}%`);
      }
      console.log("─".repeat(60));

      // Interpretation
      console.log("\n💡 Interpretation:");
      const accuracy = m.accuracy;
      if (accuracy >= 0.95) {
        console.log("   🟢 Excellent! Model has very high accuracy");
      } else if (accuracy >= 0.85) {
        console.log("   🟡 Good accuracy, but could be improved");
      } else if (accuracy >= 0.70) {
        console.log("   🟠 Moderate accuracy, consider retraining with more data");
      } else {
        console.log("   🔴 Low accuracy, model needs improvement");
      }

      console.log("\n📝 Note: These are cross-validation metrics from training.");
      console.log("   For a more detailed evaluation on a test set, run:");
      console.log("   python ml/scripts/evaluate_model_accuracy.py");
    } else {
      console.log("\n⚠️  No metrics found in the file");
    }
  } catch (error) {
    console.error("\n❌ Error reading metrics file:", error.message);
  }

  console.log("\n" + "=".repeat(60));
}

checkAccuracy();











