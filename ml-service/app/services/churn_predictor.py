import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from typing import Dict, Any

class ChurnPredictor:
  def __init__(self):
    self.model = LogisticRegression()
    self._train_initial_model()

  def _train_initial_model(self):
    np.random.seed(101)
    
    # 200 driver rows
    # Features:
    # 1. Cancellation rate: 0.0 to 0.4
    cancellation_rates = np.random.uniform(0.0, 0.4, 200)
    
    # 2. Rating: 3.5 to 5.0
    ratings = np.random.uniform(3.5, 5.0, 200)
    
    # 3. Completed deliveries: 0 to 500
    deliveries = np.random.randint(0, 500, size=200)
    
    # 4. Earnings per delivery (average): Rs 80 to Rs 180
    avg_earnings = np.random.uniform(80.0, 180.0, 200)
    
    # Churn function probability:
    # Churn increases with higher cancellation rate, lower rating, fewer deliveries (new driver), and lower average earnings
    churn_log_odds = (
      cancellation_rates * 15.0 - 
      (ratings - 3.5) * 4.0 - 
      (deliveries / 100.0) * 1.2 - 
      (avg_earnings - 80.0) * 0.02 + 
      1.5 # Intercept
    )
    
    # Probability conversion
    probs = 1 / (1 + np.exp(-churn_log_odds))
    
    # Generate labels (0 = retained, 1 = churned)
    labels = np.random.binomial(1, probs)
    
    X = pd.DataFrame({
      'cancellation_rate': cancellation_rates,
      'rating': ratings,
      'completed_deliveries': deliveries,
      'avg_earnings': avg_earnings
    })
    
    self.model.fit(X, labels)
    print("SUCCESS: Scikit-Learn Driver Churn Classifier trained successfully!")

  def predict_churn(self, cancellation_rate: float, rating: float, completed_deliveries: int, earnings: float) -> float:
    # Average earnings per delivery
    avg_earnings = earnings / max(1, completed_deliveries)
    if completed_deliveries == 0:
      avg_earnings = 100.0 # Default
      
    input_df = pd.DataFrame({
      'cancellation_rate': [cancellation_rate],
      'rating': [rating],
      'completed_deliveries': [completed_deliveries],
      'avg_earnings': [avg_earnings]
    })
    
    # Get probability of class 1 (churn)
    prob_churn = self.model.predict_proba(input_df)[0][1]
    return float(round(prob_churn, 3))
