"""
data_generator.py

Generates synthetic behavioral authentication dataset with legitimate and fraudulent sessions.
Used for training and testing models in the authentication project.
"""
import numpy as np

def generate_sample_data():
    """Generate sample data for testing"""
    sample_data = []
    
    # Generate legitimate user sessions
    for i in range(100000):
        session = {
            'user_id': 'user_001',
            'daily_login_count': np.random.normal(3, 1),
            'session_time': np.random.normal(300, 50),  # 5 minutes average
            'keystroke_dynamics': {
                'avg_speed': np.random.normal(150, 20),
                'rhythm_variance': np.random.normal(0.2, 0.05),
                'avg_pressure': np.random.normal(0.7, 0.1),
                'swipe_velocity': np.random.normal(200, 30)
            },
            'navigation_pattern': {
                'screen_sequence_score': np.random.normal(0.8, 0.1),
                'direct_sensitive_access': 0 if np.random.random() > 0.1 else 1,
                'avg_dwell_time': np.random.normal(10, 3)
            },
            'transaction_data': {
                'amount': np.random.normal(100, 50),
                'payee_score': np.random.normal(0.9, 0.1),
                'frequency': np.random.normal(5, 2),
                'balance_checks': np.random.normal(2, 1)
            },
            'location_data': {
                'familiarity_score': np.random.normal(0.9, 0.1),
                'wifi_match': np.random.normal(0.95, 0.05),
                'bluetooth_count': np.random.normal(3, 1),
                'travel_distance': np.random.normal(5, 10)
            },
            'biometric_data': {
                'tremor_match_score': np.random.normal(0.95, 0.05),
                'gyro_similarity': np.random.normal(0.9, 0.1),
                'accel_similarity': np.random.normal(0.9, 0.1)
            },
            'panic_gesture': 0,
            'decoy_response': 1,
            'is_legitimate': 1
        }
        sample_data.append(session)
    
    # Generate fraudulent sessions
    for i in range(10000):
        session = {
            'user_id': 'user_001',
            'daily_login_count': np.random.normal(1, 0.5),  # Less frequent
            'session_time': np.random.normal(600, 100),  # Longer sessions
            'keystroke_dynamics': {
                'avg_speed': np.random.normal(100, 30),  # Different typing speed
                'rhythm_variance': np.random.normal(0.4, 0.1),  # More variance
                'avg_pressure': np.random.normal(0.5, 0.2),  # Different pressure
                'swipe_velocity': np.random.normal(150, 50)  # Different velocity
            },
            'navigation_pattern': {
                'screen_sequence_score': np.random.normal(0.3, 0.2),  # Unfamiliar navigation
                'direct_sensitive_access': 1 if np.random.random() > 0.5 else 0,  # More direct access
                'avg_dwell_time': np.random.normal(5, 2)  # Less dwell time
            },
            'transaction_data': {
                'amount': np.random.normal(500, 200),  # Higher amounts
                'payee_score': np.random.normal(0.2, 0.1),  # Unknown payees
                'frequency': np.random.normal(1, 0.5),  # Less frequent
                'balance_checks': np.random.normal(5, 2)  # More balance checks
            },
            'location_data': {
                'familiarity_score': np.random.normal(0.2, 0.1),  # Unfamiliar location
                'wifi_match': np.random.normal(0.1, 0.05),  # No wifi match
                'bluetooth_count': np.random.normal(0, 1),  # No familiar devices
                'travel_distance': np.random.normal(100, 50)  # Far from usual location
            },
            'biometric_data': {
                'tremor_match_score': np.random.normal(0.3, 0.2),  # Poor biometric match
                'gyro_similarity': np.random.normal(0.4, 0.2),
                'accel_similarity': np.random.normal(0.4, 0.2)
            },
            'panic_gesture': 1 if np.random.random() > 0.8 else 0,  # Occasional panic
            'decoy_response': 0 if np.random.random() > 0.7 else 1,  # Poor decoy response
            'is_legitimate': 0
        }
        sample_data.append(session)
    
    return sample_data