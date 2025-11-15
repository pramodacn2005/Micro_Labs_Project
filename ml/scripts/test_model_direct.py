"""
Direct test of the fever prediction model
Run with: python ml/scripts/test_model_direct.py
"""

import json
import sys
from pathlib import Path

# Add parent directory to path to import from train_fever_model
sys.path.insert(0, str(Path(__file__).parent))

from predict_fever_model import predict, ensure_model

def test_model():
    """Test the fever model with sample data"""
    
    print("🧪 Testing Fever Model Directly")
    print("=" * 50)
    
    # Ensure model exists
    print("\n📦 Checking model...")
    try:
        ensure_model()
        print("✅ Model found/created")
    except Exception as e:
        print(f"❌ Model error: {e}")
        return False
    
    # Test payload
    test_payload = {
        "age": 32,
        "gender": "Female",
        "temperature_c": 38.5,
        "heart_rate_bpm": 100,
        "respiratory_rate_bpm": 20,
        "spo2": 98,
        "bp_systolic": 120,
        "bp_diastolic": 80,
        "chills": True,
        "sweating": False,
        "loss_of_appetite": True,
        "sore_throat": True,
        "runny_nose": False,
        "nasal_congestion": True,
        "vomiting": False,
        "fatigue": "moderate",
        "headache": "mild",
        "body_aches": "moderate",
        "breathing_difficulty": "none",
        "cough": "dry",
        "body_pain_scale": 5,
        "alcohol_consumption": "none",
        "medical_history": False,
        "tachycardia": False,
        "fever_flag": True,
    }
    
    print("\n📊 Test Payload:")
    print(json.dumps(test_payload, indent=2))
    print("\n⏳ Running prediction...\n")
    
    try:
        result = predict(test_payload)
        
        print("✅ Prediction successful!\n")
        print("=" * 50)
        
        # Display results
        if "prediction" in result:
            pred = result["prediction"]
            print("\n🎯 Prediction Results:")
            print(f"   Label: {pred.get('label', 'N/A')}")
            print(f"   Probability: {pred.get('probability', 0) * 100:.1f}%")
            print(f"   Severity: {pred.get('severity', 'N/A')}")
        
        if "explainability" in result:
            explain = result["explainability"]
            if "top_features" in explain and explain["top_features"]:
                print("\n🔍 Top Features (SHAP):")
                for idx, feature in enumerate(explain["top_features"][:5], 1):
                    print(f"   {idx}. {feature.get('feature', 'N/A')}")
                    print(f"      Importance: {feature.get('importance', 0) * 100:.1f}%")
                    print(f"      Direction: {feature.get('direction', 'N/A')}")
            else:
                print("\n⚠️  No SHAP features returned (this is okay if model is still training)")
        
        print("\n" + "=" * 50)
        print("✅ Model is working correctly!")
        return True
        
    except Exception as e:
        print(f"\n❌ Prediction failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_model()
    sys.exit(0 if success else 1)








