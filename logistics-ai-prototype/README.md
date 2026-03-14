# AI-Powered Resilient Logistics and Dynamic Supply Chain Optimization

Prototype for the Google Solution Challenge using Google Cloud and Firebase services.

## Architecture
- Frontend: React + Vite + Firebase Web SDK + Google Maps Platform
- Backend: Firebase Cloud Functions (Node.js)
- Database: Firestore
- Auth: Firebase Authentication (Google Sign-In)
- AI/ML: Vertex AI delay prediction (proxy via Cloud Functions)
- Analytics: BigQuery
- Hosting: Firebase Hosting

## Project Structure
- /frontend: React app
- /functions: Firebase Cloud Functions API
- /models: Vertex AI integration notes/scripts
- /dataset: sample data placeholder
- firebase.json, .firebaserc

## Google Cloud and Firebase Setup
1) Create or select the Google Cloud project
- Project ID: logistics-ai-prototype
- Project Number: 1068470706933

2) Enable required APIs
```
gcloud services enable \
  aiplatform.googleapis.com \
  bigquery.googleapis.com \
  firestore.googleapis.com \
  cloudfunctions.googleapis.com \
  firebase.googleapis.com \
  firebasedatabase.googleapis.com \
  maps-backend.googleapis.com
```

3) Firebase setup
```
firebase login
firebase use --add logistics-ai-prototype
```

4) Firestore
- Create a Firestore database in Native mode.
- Collection name used by the app: shipments

5) BigQuery dataset/table
Create a dataset and table for analytics:
```
# Example dataset and table
bq mk --dataset logistics_ai
bq mk --table logistics_ai.shipments \
  shipment_id:STRING,origin:STRING,destination:STRING,distance:FLOAT,traffic_level:STRING,weather_condition:STRING,estimated_delivery_time:FLOAT,delay_risk:FLOAT,created_at:TIMESTAMP
```

6) Vertex AI endpoint
- Deploy a prediction endpoint that accepts instances with fields:
  distance, traffic_level, weather_condition
- Copy the endpoint REST URL and place it in functions/.env, or set project/location/endpoint ID.

7) Google Maps Platform
- Enable Maps JavaScript API and Geocoding API
- Create an API key and set it in frontend/.env

## Environment Configuration
Frontend (.env)
```
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=logistics-ai-prototype
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_MAPS_API_KEY=your_maps_key
VITE_FUNCTIONS_BASE_URL=/api
```

Functions (functions/.env)
```
VERTEX_AI_ENDPOINT=https://us-central1-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/REGION/endpoints/ENDPOINT_ID:predict
VERTEX_AI_PROJECT=your_project_id
VERTEX_AI_LOCATION=us-central1
VERTEX_AI_ENDPOINT_ID=your_endpoint_id
BQ_DATASET=logistics_ai
BQ_TABLE=shipments
BQ_SYNC_LIMIT=50
```

## Run Locally
1) Install dependencies
```
cd frontend
npm install
cd ../functions
npm install
```

2) Start emulators
```
firebase emulators:start
```

3) Run the frontend
```
cd frontend
npm run dev
```

## Deploy
```
firebase deploy
```

## Notes
- If Vertex AI is not configured, the API falls back to a heuristic delay risk model.
- Map rendering requires valid coordinates. The form supports optional latitude/longitude fields.
- BigQuery sync runs every 30 minutes via `bqSync` and marks Firestore docs with `bq_exported: true`.
- You can trigger a manual sync with `POST /api/analytics/sync`.

