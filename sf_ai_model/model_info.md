🛡️ Behavioral Authentication Model
This project implements a behavioral authentication model to detect and block fraudulent login sessions based on user behavior, location, biometrics, and transaction patterns.

The model is trained on a synthetic dataset that simulates both legitimate and fraudulent sessions.

📁 Files
File/Folder	Purpose
models/secureFlow.py	            Trains and evaluates the authentication models.
models/behavioral_auth_model.pkl	Saved trained Random Forest model.
utils/data_generator.py	            Generates synthetic data for training/testing.
requirements.txt	                Lists required Python libraries.

📝 Usage
Run my_model.py to train and save the model.

Use data_generator.py to generate synthetic data if needed.