import json
import os
import requests
from google.auth import default
from google.auth.transport.requests import Request

# Example client for calling a Vertex AI endpoint directly.
# Requires: pip install google-auth requests

def predict(distance, traffic_level, weather_condition):
    endpoint = os.environ.get("VERTEX_AI_ENDPOINT")
    if not endpoint:
        raise RuntimeError("VERTEX_AI_ENDPOINT is not set")

    creds, _ = default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
    creds.refresh(Request())

    payload = {
        "instances": [
            {
                "distance": distance,
                "traffic_level": traffic_level,
                "weather_condition": weather_condition
            }
        ]
    }

    headers = {
        "Authorization": f"Bearer {creds.token}",
        "Content-Type": "application/json"
    }

    resp = requests.post(endpoint, headers=headers, data=json.dumps(payload))
    resp.raise_for_status()
    return resp.json()

if __name__ == "__main__":
    print(predict(120.5, "high", "rain"))
