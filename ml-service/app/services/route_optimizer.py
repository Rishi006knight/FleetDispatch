import math
from typing import Dict, List, Any

class RouteOptimizer:
  @staticmethod
  def optimize_route(driver_loc: Dict[str, float], pickup: Dict[str, float], drop: Dict[str, float]) -> Dict[str, Any]:
    # We want to create a path from driver -> pickup -> drop.
    # To simulate real city street grid layout, we will generate path points.
    
    path = []
    
    # 1. From Driver to Pickup
    RouteOptimizer._add_grid_path(driver_loc, pickup, path)
    
    # 2. From Pickup to Drop
    RouteOptimizer._add_grid_path(pickup, drop, path)
    
    # Calculate distance in km (Haversine formula approximation)
    total_distance_km = 0.0
    for i in range(len(path) - 1):
      p1 = path[i]
      p2 = path[i+1]
      total_distance_km += RouteOptimizer._haversine(p1['lat'], p1['lng'], p2['lat'], p2['lng'])
      
    # Average travel speed 30 km/h in city + 3 minutes average wait at pickup
    total_eta_minutes = (total_distance_km / 30.0) * 60.0 + 3.0
    
    return {
      "route": path,
      "total_distance_km": round(total_distance_km, 2),
      "total_eta_minutes": round(total_eta_minutes, 1)
    }

  @staticmethod
  def _add_grid_path(start: Dict[str, float], end: Dict[str, float], path: List[Dict[str, float]]):
    # Add starting point if path is empty, otherwise ensure no duplicate
    if not path:
      path.append({"lat": start['lat'], "lng": start['lng']})
      
    lat1, lng1 = start['lat'], start['lng']
    lat2, lng2 = end['lat'], end['lng']
    
    # Split into 5 street segments (Manhattan street grid layout)
    # segment 1: go lat halfway
    lat_mid = lat1 + (lat2 - lat1) * 0.5
    # segment 2: go lng all the way
    # segment 3: go lat the remaining way
    
    steps = 15
    for i in range(1, steps + 1):
      t = i / steps
      if t <= 0.4:
        # Move along latitude first (north/south street)
        sub_t = t / 0.4
        curr_lat = lat1 + (lat_mid - lat1) * sub_t
        curr_lng = lng1
      elif t <= 0.8:
        # Move along longitude (east/west avenue)
        sub_t = (t - 0.4) / 0.4
        curr_lat = lat_mid
        curr_lng = lng1 + (lng2 - lng1) * sub_t
      else:
        # Move remaining latitude
        sub_t = (t - 0.8) / 0.2
        curr_lat = lat_mid + (lat2 - lat_mid) * sub_t
        curr_lng = lng2
        
      # Add small street-noise fluctuations for aesthetics (e.g. 0.0001 degrees)
      # to simulate driving slightly around small roundabouts or lane changes
      noise_lat = math.sin(t * 10) * 0.00005
      noise_lng = math.cos(t * 10) * 0.00005
      
      path.append({
        "lat": round(curr_lat + noise_lat, 6),
        "lng": round(curr_lng + noise_lng, 6)
      })

  @staticmethod
  def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    # Radius of earth in km
    R = 6371.0
    
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c
