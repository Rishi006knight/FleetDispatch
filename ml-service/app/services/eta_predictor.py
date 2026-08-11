import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from typing import Dict, Any

class ETAPredictor:
  def __init__(self):
    # Initialize and train a real Scikit-Learn linear regression model on startup
    self.model = LinearRegression()
    self._train_initial_model()

  def _train_initial_model(self):
    # Generate synthetic historical delivery data: 200 samples
    np.random.seed(42)
    
    # Features:
    # 1. Distance (1 to 20 km)
    distances = np.random.uniform(1.0, 20.0, 200)
    
    # 2. Priority: 0 (low/medium), 1 (high)
    priorities = np.random.binomial(1, 0.3, 200)
    
    # 3. Weather impact: 0 (clear), 1 (rain), 2 (storm)
    weather_codes = np.random.choice([0, 1, 2], size=200, p=[0.7, 0.25, 0.05])
    
    # 4. Traffic congestion: 0 (low), 1 (moderate), 2 (heavy)
    traffic_codes = np.random.choice([0, 1, 2], size=200, p=[0.5, 0.35, 0.15])
    
    # Target delivery time (minutes)
    # Base: 5 mins + 2 mins per km + 4 mins if heavy traffic + 8 mins if storm - 2 mins if high priority
    times = (
      5.0 + 
      distances * 2.2 + 
      priorities * -2.0 + 
      weather_codes * 4.5 + 
      traffic_codes * 3.8 + 
      np.random.normal(0, 1.5, 200) # Noise
    )
    
    # Ensure times are realistic (minimum 4 minutes)
    times = np.clip(times, 4.0, None)
    
    # Build DataFrame
    X = pd.DataFrame({
      'distance': distances,
      'priority': priorities,
      'weather': weather_codes,
      'traffic': traffic_codes
    })
    
    # Train
    self.model.fit(X, times)
    print("SUCCESS: Scikit-Learn ETA Predictor Model trained successfully!")

  def predict_eta(self, distance: float, priority: str, weather: str, traffic: str) -> float:
    # Map input text features to numerical values
    priority_val = 1 if priority == 'high' else 0
    
    weather_map = {'clear': 0, 'rain': 1, 'storm': 2}
    weather_val = weather_map.get(weather.lower(), 0)
    
    traffic_map = {'normal': 0, 'moderate': 1, 'heavy': 2}
    traffic_val = traffic_map.get(traffic.lower(), 0)
    
    input_data = pd.DataFrame({
      'distance': [distance],
      'priority': [priority_val],
      'weather': [weather_val],
      'traffic': [traffic_val]
    })
    
    pred_time = self.model.predict(input_data)[0]
    return float(round(max(3.0, pred_time), 1))
