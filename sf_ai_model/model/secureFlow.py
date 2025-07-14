import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils import data_generator as dg
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import joblib
from datetime import datetime, timedelta
import json
import warnings
warnings.filterwarnings('ignore')

class BehavioralAuthModel:
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.encoders = {}
        self.user_profiles = {}
        self.risk_thresholds = {
            'low': 0.3,
            'medium': 0.6,
            'high': 0.8
        }
        
    def extract_features(self, user_data):
        """Extract features from user interaction data"""
        features = {}
        
        # 1. Behavioral Profiling Features
        features['login_frequency'] = user_data.get('daily_login_count', 0)
        features['session_duration'] = user_data.get('session_time', 0)
        features['hour_of_day'] = datetime.now().hour
        features['day_of_week'] = datetime.now().weekday()
        
        # 2. Keystroke & Gesture Dynamics
        keystroke_data = user_data.get('keystroke_dynamics', {})
        features['avg_typing_speed'] = keystroke_data.get('avg_speed', 0)
        features['typing_rhythm_variance'] = keystroke_data.get('rhythm_variance', 0)
        features['tap_pressure'] = keystroke_data.get('avg_pressure', 0)
        features['swipe_velocity'] = keystroke_data.get('swipe_velocity', 0)
        
        # 3. Navigation & Session Flow
        navigation = user_data.get('navigation_pattern', {})
        features['typical_screen_sequence'] = navigation.get('screen_sequence_score', 0)
        features['direct_to_sensitive'] = navigation.get('direct_sensitive_access', 0)
        features['page_dwell_time'] = navigation.get('avg_dwell_time', 0)
        
        # 4. Transaction Habits
        transaction = user_data.get('transaction_data', {})
        features['transaction_amount'] = transaction.get('amount', 0)
        features['payee_familiarity'] = transaction.get('payee_score', 1)
        features['transaction_frequency'] = transaction.get('frequency', 0)
        features['balance_check_frequency'] = transaction.get('balance_checks', 0)
        
        # 5. Location & Context
        location = user_data.get('location_data', {})
        features['location_familiarity'] = location.get('familiarity_score', 1)
        features['wifi_pattern_match'] = location.get('wifi_match', 1)
        features['bluetooth_devices'] = location.get('bluetooth_count', 0)
        features['travel_distance'] = location.get('travel_distance', 0)
        
        # 6. Hand-Tremor Micro Signature
        biometric = user_data.get('biometric_data', {})
        features['tremor_signature'] = biometric.get('tremor_match_score', 1)
        features['gyroscope_pattern'] = biometric.get('gyro_similarity', 1)
        features['accelerometer_pattern'] = biometric.get('accel_similarity', 1)
        
        # 7. Secret Gesture
        features['panic_gesture_triggered'] = user_data.get('panic_gesture', 0)
        
        # 8. Decoy Screen Response
        features['decoy_interaction_normal'] = user_data.get('decoy_response', 1)
        
        return features
    
    def build_user_profile(self, user_id, historical_data):
        """Build baseline profile for a user"""
        profile = {
            'user_id': user_id,
            'baseline_features': {},
            'behavioral_patterns': {},
            'risk_factors': []
        }
        
        # Calculate baseline statistics
        for session in historical_data:
            features = self.extract_features(session)
            for key, value in features.items():
                if key not in profile['baseline_features']:
                    profile['baseline_features'][key] = []
                profile['baseline_features'][key].append(value)
        
        # Compute statistical measures
        for key, values in profile['baseline_features'].items():
            values = np.array(values)
            profile['baseline_features'][key] = {
                'mean': np.mean(values),
                'std': np.std(values),
                'min': np.min(values),
                'max': np.max(values),
                'percentile_25': np.percentile(values, 25),
                'percentile_75': np.percentile(values, 75)
            }
        
        self.user_profiles[user_id] = profile
        return profile
    
    def train_models(self, training_data):
        """Train the behavioral authentication models"""
        
        # Prepare training data
        X = []
        y = []
        
        for session in training_data:
            features = self.extract_features(session)
            feature_vector = list(features.values())
            X.append(feature_vector)
            y.append(session.get('is_legitimate', 1))  # 1 = legitimate, 0 = fraudulent
        
        X = np.array(X)
        y = np.array(y)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Scale features
        self.scalers['main'] = StandardScaler()
        X_train_scaled = self.scalers['main'].fit_transform(X_train)
        X_test_scaled = self.scalers['main'].transform(X_test)
        
        # Train Random Forest for classification
        self.models['random_forest'] = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42
        )
        self.models['random_forest'].fit(X_train_scaled, y_train)
        
        # Train Isolation Forest for anomaly detection
        self.models['isolation_forest'] = IsolationForest(
            contamination=0.1,
            random_state=42
        )
        self.models['isolation_forest'].fit(X_train_scaled[y_train == 1])  # Train only on legitimate users
        
        # Evaluate models
        rf_pred = self.models['random_forest'].predict(X_test_scaled)
        if_pred = self.models['isolation_forest'].predict(X_test_scaled)
        if_pred = np.where(if_pred == 1, 1, 0)  # Convert to binary
        
        print("Random Forest Classification Report:")
        print(classification_report(y_test, rf_pred))
        print("\nIsolation Forest Classification Report:")
        print(classification_report(y_test, if_pred))
        
        return self.models
    
    def calculate_risk_score(self, user_id, current_session):
        """Calculate risk score for current session"""
        if user_id not in self.user_profiles:
            return 0.9  # High risk for unknown user
        
        profile = self.user_profiles[user_id]
        current_features = self.extract_features(current_session)
        
        risk_factors = []
        total_deviation = 0
        
        # Calculate deviations from baseline
        for feature, value in current_features.items():
            if feature in profile['baseline_features']:
                baseline = profile['baseline_features'][feature]
                std = max(baseline['std'], 1e-6)  # avoid tiny std
                z_score = abs(value - baseline['mean']) / std
                if z_score > 2:
                    risk_factors.append(f"{feature}: {z_score:.2f} std devs")
                    total_deviation += z_score

        
        # Specific high-risk indicators
        if current_features.get('panic_gesture_triggered', 0) == 1:
            risk_factors.append("Panic gesture detected")
            total_deviation += 5
        
        if current_features.get('direct_to_sensitive', 0) == 1:
            risk_factors.append("Direct access to sensitive area")
            total_deviation += 3
        
        if current_features.get('location_familiarity', 1) < 0.3:
            risk_factors.append("Unfamiliar location")
            total_deviation += 2
        
        if current_features.get('tremor_signature', 1) < 0.7:
            risk_factors.append("Biometric signature mismatch")
            total_deviation += 4
        
        # Normalize risk score
        risk_score = max(min(total_deviation / 10, 1.0), 0.05)
        
        return risk_score, risk_factors
    
    def classify_user(self, user_id, current_session):
        """Main classification function"""
        # Extract features
        features = self.extract_features(current_session)
        feature_vector = np.array(list(features.values())).reshape(1, -1)
        
        # Scale features
        if 'main' in self.scalers:
            feature_vector_scaled = self.scalers['main'].transform(feature_vector)
        else:
            feature_vector_scaled = feature_vector
        
        # Get predictions from models
        predictions = {}
        
        if 'random_forest' in self.models:
            rf_pred = self.models['random_forest'].predict(feature_vector_scaled)[0]
            rf_prob = self.models['random_forest'].predict_proba(feature_vector_scaled)[0][1]
            predictions['random_forest'] = {'prediction': rf_pred, 'confidence': rf_prob}
        
        if 'isolation_forest' in self.models:
            if_pred_raw = self.models['isolation_forest'].predict(feature_vector_scaled)[0]
            if_pred = 1 if if_pred_raw == 1 else 0
            anomaly_score = self.models['isolation_forest'].decision_function(feature_vector_scaled)[0]
            # Normalize anomaly_score to [0,1] (optional: depends on distribution)
            anomaly_confidence = max(min(0.5 + anomaly_score/2, 1.0), 0.0)
            predictions['isolation_forest'] = {'prediction': if_pred, 'confidence': anomaly_confidence}
        
        # Calculate risk score
        risk_score, risk_factors = self.calculate_risk_score(user_id, current_session)
        
        # Determine final classification
        if risk_score >= self.risk_thresholds['high']:
            classification = 'BLOCK'
            action = 'Block transaction and lock session'
        elif risk_score >= self.risk_thresholds['medium']:
            classification = 'CHALLENGE'
            action = 'Request additional authentication (OTP/Biometric)'
        elif risk_score >= self.risk_thresholds['low']:
            classification = 'MONITOR'
            action = 'Continue with increased monitoring'
        else:
            classification = 'ALLOW'
            action = 'Continue normally'
        
        return {
            'user_id': user_id,
            'classification': classification,
            'action': action,
            'risk_score': risk_score,
            'risk_factors': risk_factors,
            'model_predictions': predictions,
            'timestamp': datetime.now().isoformat()
        }
    
    def save_model(self, filepath):
        """Save trained model to file"""
        model_data = {
            'models': self.models,
            'scalers': self.scalers,
            'encoders': self.encoders,
            'user_profiles': self.user_profiles,
            'risk_thresholds': self.risk_thresholds
        }
        joblib.dump(model_data, filepath)
    
    def load_model(self, filepath):
        """Load trained model from file"""
        model_data = joblib.load(filepath)
        self.models = model_data['models']
        self.scalers = model_data['scalers']
        self.encoders = model_data['encoders']
        self.user_profiles = model_data['user_profiles']
        self.risk_thresholds = model_data['risk_thresholds']

# Demo usage
if __name__ == "__main__":
    # Initialize model
    auth_model = BehavioralAuthModel()
    
    # Generate sample data
    training_data = dg.generate_sample_data()
    
    # Build user profile
    legitimate_sessions = [s for s in training_data if s['is_legitimate'] == 1]
    auth_model.build_user_profile('user_001', legitimate_sessions)
    
    # Train models
    print("Training behavioral authentication models...")
    auth_model.train_models(training_data)
    
    # Test classification on new session
    test_session = {
        'user_id': 'user_001',
        'daily_login_count': 1,  # Suspicious: low login frequency
        'session_time': 800,  # Suspicious: long session
        'keystroke_dynamics': {
            'avg_speed': 80,  # Suspicious: slow typing
            'rhythm_variance': 0.5,  # Suspicious: high variance
            'avg_pressure': 0.3,  # Suspicious: low pressure
            'swipe_velocity': 100  # Suspicious: slow swipes
        },
        'navigation_pattern': {
            'screen_sequence_score': 0.2,  # Suspicious: unfamiliar navigation
            'direct_sensitive_access': 1,  # Suspicious: direct to sensitive area
            'avg_dwell_time': 3  # Suspicious: quick navigation
        },
        'transaction_data': {
            'amount': 1000,  # Suspicious: high amount
            'payee_score': 0.1,  # Suspicious: unknown payee
            'frequency': 0.5,  # Suspicious: rare transaction
            'balance_checks': 8  # Suspicious: many balance checks
        },
        'location_data': {
            'familiarity_score': 0.1,  # Suspicious: unfamiliar location
            'wifi_match': 0.05,  # Suspicious: no wifi match
            'bluetooth_count': 0,  # Suspicious: no familiar devices
            'travel_distance': 200  # Suspicious: far from usual location
        },
        'biometric_data': {
            'tremor_match_score': 0.2,  # Suspicious: poor biometric match
            'gyro_similarity': 0.3,
            'accel_similarity': 0.3
        },
        'panic_gesture': 0,
        'decoy_response': 0  # Suspicious: failed decoy test
    }
    
    # Classify the session
    result = auth_model.classify_user('user_001', test_session)
    
    print("\n" + "="*50)
    print("BEHAVIORAL AUTHENTICATION RESULT")
    print("="*50)
    print(f"User ID: {result['user_id']}")
    print(f"Classification: {result['classification']}")
    print(f"Action: {result['action']}")
    print(f"Risk Score: {result['risk_score']:.3f}")
    print(f"Risk Factors: {len(result['risk_factors'])}")
    for factor in result['risk_factors']:
        print(f"  - {factor}")
    print(f"Timestamp: {result['timestamp']}")
    
    # Save model
    auth_model.save_model('behavioral_auth_model.pkl')
    print("\nModel saved to 'behavioral_auth_model.pkl'")