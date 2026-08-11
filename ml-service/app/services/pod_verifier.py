import base64
import io
import math
import cv2
import numpy as np
from PIL import Image
from typing import Dict, Any

class PODVerifier:
  @staticmethod
  def verify_pod(photo_base64: str, driver_lat: float, driver_lng: float, drop_lat: float, drop_lng: float) -> Dict[str, Any]:
    # 1. Geofencing check: Is driver near the drop address?
    distance_meters = PODVerifier._haversine_meters(driver_lat, driver_lng, drop_lat, drop_lng)
    
    if distance_meters > 150.0:
      return {
        "passed": False,
        "message": f"GPS Mismatch: Driver is {round(distance_meters)}m away from destination (max limit 150m).",
        "confidence_score": 0.15
      }

    # Remove data url prefix if present
    if ',' in photo_base64:
      photo_base64 = photo_base64.split(',')[1]

    try:
      # Decode image bytes
      img_data = base64.b64decode(photo_base64)
      img_pil = Image.open(io.BytesIO(img_data))
      
      # Convert to OpenCV format (numpy array)
      open_cv_image = np.array(img_pil)
      # Convert RGB to BGR for OpenCV
      if len(open_cv_image.shape) == 3:
        if open_cv_image.shape[2] == 4: # RGBA
          open_cv_image = cv2.cvtColor(open_cv_image, cv2.COLOR_RGBA2BGR)
        else: # RGB
          open_cv_image = cv2.cvtColor(open_cv_image, cv2.COLOR_RGB2BGR)
      elif len(open_cv_image.shape) == 2: # Grayscale
        # already gray
        pass
      else:
        return {
          "passed": False,
          "message": "Invalid image dimensions.",
          "confidence_score": 0.3
        }

      # 2. Check Brightness: Is it a black screen or pocket photo?
      gray = cv2.cvtColor(open_cv_image, cv2.COLOR_BGR2GRAY) if len(open_cv_image.shape) == 3 else open_cv_image
      avg_brightness = float(np.mean(gray))
      
      if avg_brightness < 18.0:
        return {
          "passed": False,
          "message": f"Fraud Suspected: Image is too dark or empty (Avg brightness {round(avg_brightness, 1)}/255).",
          "confidence_score": 0.2
        }

      # 3. Check Texture / Edge Density: Is it a flat paper or blank wall?
      # Calculate Canny edges
      edges = cv2.Canny(gray, 50, 150)
      edge_density = float(np.sum(edges > 0)) / float(edges.size)
      
      # If image is a solid background (no packages, doors, or houses visible), edge density will be extremely low
      if edge_density < 0.005:
        return {
          "passed": False,
          "message": f"Fraud Suspected: Image contains no visible features or outlines (Blank image/floor upload).",
          "confidence_score": 0.35
        }

      # Calculate confidence score
      # Combine brightness factor, edge density, and distance proximity
      distance_factor = max(0.0, 1.0 - (distance_meters / 150.0)) # 1.0 (near) to 0.0 (far)
      brightness_factor = min(1.0, avg_brightness / 128.0) # 0.0 to 1.0
      edge_factor = min(1.0, edge_density * 20.0) # normalize edge density
      
      confidence = (distance_factor * 0.4) + (brightness_factor * 0.3) + (edge_factor * 0.3)
      confidence = float(round(confidence, 2))

      return {
        "passed": True,
        "message": f"Proof of Delivery verified successfully. Edge density: {round(edge_density*100, 2)}%, Proximity match: {round(distance_meters)}m.",
        "confidence_score": confidence
      }
      
    except Exception as e:
      # If image decoding fails, return fail
      return {
        "passed": False,
        "message": f"Invalid Image: Failed to parse photo upload ({str(e)}).",
        "confidence_score": 0.1
      }

  @staticmethod
  def _haversine_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371000.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c
