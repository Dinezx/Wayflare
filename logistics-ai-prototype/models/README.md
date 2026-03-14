Vertex AI integration notes.

- Train and deploy a model that predicts delay risk from distance, traffic_level, and weather_condition.
- Export the prediction endpoint URL and set VERTEX_AI_ENDPOINT in functions/.env
- The Cloud Function proxy will call the endpoint if configured.
