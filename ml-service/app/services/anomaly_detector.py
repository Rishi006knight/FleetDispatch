import math
from typing import Dict, List, Any

class AnomalyDetector:
  @staticmethod
  def detect_deviation(current_lat: float, current_lng: float, route: List[Dict[str, float]]) -> Dict[str, Any]:
    if not route or len(route) == 0:
      return {"deviated": False, "distance_meters": 0.0}
      
    # Find the minimum distance (in meters) from current location to any point in the route
    min_dist_meters = float('inf')
    
    for point in route:
      dist = AnomalyDetector._haversine_meters(current_lat, current_lng, point['lat'], point['lng'])
      if dist < min_dist_meters:
        min_dist_meters = dist
        
    # Standard deviation threshold: 350 meters
    deviated = min_dist_meters > 350.0
    
    return {
      "deviated": deviated,
      "distance_meters": round(min_dist_meters, 1)
    }

  @staticmethod
  def _haversine_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    # Earth radius in meters
    R = 6371000.0
    
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c
