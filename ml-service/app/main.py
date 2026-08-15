from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any

# Import services
from app.services.route_optimizer import RouteOptimizer
from app.services.eta_predictor import ETAPredictor
from app.services.churn_predictor import ChurnPredictor
from app.services.anomaly_detector import AnomalyDetector
from app.services.simulator import OperationsSimulator

app = FastAPI(title="AI Fleet & Logistics Intelligence API", version="1.0.0")

# Setup CORS
app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

# Initialize Predictors
eta_predictor = ETAPredictor()
churn_predictor = ChurnPredictor()

# Schema definitions
class PricingRequest(BaseModel):
  distance: float
  priority: str
  package_type: str
  weather: str
  traffic: str
  hour: int

class RiskRequest(BaseModel):
  distance: float
  priority: str
  package_weight: float
  driver_rating: float
  driver_reliability: float
  weather: str

class RouteRequest(BaseModel):
  driver_location: Dict[str, Any]
  pickup: Dict[str, Any]
  drop: Dict[str, Any]

class ChurnRequest(BaseModel):
  cancellation_rate: float
  rating: float
  completed_deliveries: int
  earnings: float

class DeviationRequest(BaseModel):
  current_lat: float
  current_lng: float
  route: List[Dict[str, float]]

class SimulationRequest(BaseModel):
  current_drivers: int
  current_orders: int
  additional_drivers: int
  demand_increase_percent: float
  zone: str


# Endpoints
@app.get("/health")
def health_check():
  return {"status": "HEALTHY", "services": "ALL_SYSTEMS_OPERATIONAL"}

@app.post("/api/predict-price")
def predict_price(req: PricingRequest):
  try:
    # Mathematical pricing formula incorporating surge metrics
    base = 50.0
    dist_cost = req.distance * 12.0
    
    traffic_surge = 1.0
    if req.traffic == 'heavy':
      traffic_surge = 1.30
    elif req.traffic == 'moderate':
      traffic_surge = 1.12
      
    weather_surge = 1.0
    if req.weather == 'storm':
      weather_surge = 1.40
    elif req.weather == 'rain':
      weather_surge = 1.15
      
    hour_surge = 1.0
    # Peak commuting hours: 8-10, 17-20
    if (8 <= req.hour <= 10) or (17 <= req.hour <= 20):
      hour_surge = 1.18
      
    priority_cost = 35.0 if req.priority == 'high' else 0.0
    
    price = (base + dist_cost + priority_cost) * traffic_surge * weather_surge * hour_surge
    
    return {
      "price": float(round(price, 2)),
      "breakdown": {
        "base_price": base,
        "distance_price": round(dist_cost, 2),
        "priority_surcharge": priority_cost,
        "surge_multiplier": round(traffic_surge * weather_surge * hour_surge, 2)
      }
    }
  except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/predict-risk")
def predict_risk(req: RiskRequest):
  try:
    # Predict real-time risk of delivery delays or theft
    delay_prob = 0.05
    # Long distance adds risk
    delay_prob += req.distance * 0.015
    # Low driver rating adds risk
    delay_prob += (5.0 - req.driver_rating) * 0.1
    # Low driver reliability adds risk
    delay_prob += (1.0 - req.driver_reliability) * 0.25
    # Weather impact
    if req.weather == 'storm':
      delay_prob += 0.35
    elif req.weather == 'rain':
      delay_prob += 0.12
      
    theft_prob = 0.02
    # High priority or valuable packages add theft risk
    if req.priority == 'high':
      theft_prob += 0.08
    if req.distance > 10:
      theft_prob += 0.04
      
    failed_prob = 0.01 + (1.0 - req.driver_reliability) * 0.15
    if req.weather == 'storm':
      failed_prob += 0.10
      
    overall = (delay_prob * 0.5) + (theft_prob * 0.25) + (failed_prob * 0.25)
    
    # Cap values at 0.99
    delay_prob = min(0.99, max(0.01, delay_prob))
    theft_prob = min(0.99, max(0.01, theft_prob))
    failed_prob = min(0.99, max(0.01, failed_prob))
    overall = min(0.99, max(0.01, overall))
    
    return {
      "risk": {
        "delayProb": float(round(delay_prob, 3)),
        "theftProb": float(round(theft_prob, 3)),
        "failedProb": float(round(failed_prob, 3)),
        "overall": float(round(overall, 3))
      }
    }
  except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/optimize-route")
def optimize_route(req: RouteRequest):
  try:
    result = RouteOptimizer.optimize_route(req.driver_location, req.pickup, req.drop)
    return result
  except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/predict-churn")
def predict_churn(req: ChurnRequest):
  try:
    churn_prob = churn_predictor.predict_churn(
      req.cancellation_rate,
      req.rating,
      req.completed_deliveries,
      req.earnings
    )
    return {"churn_probability": churn_prob}
  except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/detect-deviation")
def detect_deviation(req: DeviationRequest):
  try:
    result = AnomalyDetector.detect_deviation(req.current_lat, req.current_lng, req.route)
    return result
  except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/simulate")
def simulate_operations(req: SimulationRequest):
  try:
    result = OperationsSimulator.run_simulation(
      req.current_drivers,
      req.current_orders,
      req.additional_drivers,
      req.demand_increase_percent,
      req.zone
    )
    return result
  except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))
