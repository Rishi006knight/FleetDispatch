import math
from typing import Dict, Any

class OperationsSimulator:
  @staticmethod
  def run_simulation(current_drivers: int, current_orders: int, additional_drivers: int, demand_increase_percent: float, zone: str) -> Dict[str, Any]:
    # Calculate new volume
    new_orders_load = current_orders * (1 + (demand_increase_percent / 100.0))
    total_fleet_capacity = (current_drivers + additional_drivers) * 8 # average 8 orders per driver capacity per day
    
    # Congestion / Queuing factor
    load_ratio = new_orders_load / max(1.0, total_fleet_capacity)
    
    # 1. SLA compliance starts at 95% and drops as load_ratio exceeds 0.8
    if load_ratio <= 0.8:
      expected_sla = 96.0 - (load_ratio * 5.0)
    else:
      # Severe bottleneck drop
      expected_sla = 92.0 - (load_ratio - 0.8) * 60.0
      
    # Bound SLA between 45% and 98%
    expected_sla = max(45.0, min(98.0, expected_sla))
    
    # 2. Driver Utilization
    # If load is high, utilization is high (caps at 95%)
    # If capacity is way higher than load, utilization drops
    utilization = min(95.0, (new_orders_load / max(1.0, current_drivers + additional_drivers)) * 10.0)
    utilization = max(20.0, utilization)
    
    # 3. Required vehicles to maintain 92% SLA
    required_vehicles = math.ceil(new_orders_load / 7.2) # target 7.2 orders per driver
    
    # 4. Additional drivers needed
    additional_needed = max(0, required_vehicles - (current_drivers + additional_drivers))
    
    # 5. Financial impact (Assume average order value of Rs 150)
    revenue_diff = (new_orders_load * (expected_sla / 100.0) * 150.0) - (current_orders * 0.90 * 150.0)
    
    # 6. Carbon saved (Shorter route planning saves approx 0.12 kg per order due to TSP optimization)
    # Total simulated emissions saved
    carbon_saved = new_orders_load * 0.12 * (1.0 + (additional_drivers / 50.0))
    
    zone_name = zone.upper() if zone != 'all' else 'GLOBAL FLEET'
    
    return {
      "required_vehicles": required_vehicles,
      "expected_sla_percent": round(expected_sla, 1),
      "additional_drivers_required": additional_needed,
      "estimated_revenue_increase": round(revenue_diff, 2),
      "utilization_rate_percent": round(utilization, 1),
      "carbon_saved_kg": round(carbon_saved, 1),
      "message": f"Simulation complete for zone '{zone_name}'. Resource levels are {'UNDER-STAFFED' if load_ratio > 0.85 else 'OPTIMAL'}."
    }
