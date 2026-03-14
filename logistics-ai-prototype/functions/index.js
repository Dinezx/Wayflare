const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const { BigQuery } = require("@google-cloud/bigquery");
const { GoogleAuth } = require("google-auth-library");
require("dotenv").config();

admin.initializeApp();

const db = admin.firestore();
const app = express();
const bigquery = new BigQuery();

app.use(cors({ origin: true }));
app.use(express.json());

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const mapTraffic = (level) => {
  switch ((level || "").toLowerCase()) {
    case "high":
      return 0.35;
    case "medium":
      return 0.2;
    case "low":
      return 0.1;
    default:
      return 0.2;
  }
};

const mapWeather = (condition) => {
  switch ((condition || "").toLowerCase()) {
    case "storm":
      return 0.3;
    case "rain":
      return 0.2;
    case "clear":
      return 0.05;
    default:
      return 0.1;
  }
};

const heuristicRisk = (distance, traffic, weather) => {
  const base = 0.1;
  const distanceFactor = Math.min(distance / 800, 0.4);
  const trafficFactor = mapTraffic(traffic);
  const weatherFactor = mapWeather(weather);
  return clamp(base + distanceFactor + trafficFactor + weatherFactor, 0, 1);
};

const callVertexAI = async (distance, traffic, weather) => {
  const endpoint = process.env.VERTEX_AI_ENDPOINT;
  if (!endpoint) {
    return null;
  }

  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"]
  });
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const accessToken = tokenResponse.token || tokenResponse;

  const payload = {
    instances: [
      {
        distance,
        traffic_level: traffic,
        weather_condition: weather
      }
    ]
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.warn("Vertex AI error", { status: response.status, errorText });
    return null;
  }

  const data = await response.json();
  const prediction = data.predictions && data.predictions[0];
  if (typeof prediction === "number") {
    return clamp(prediction, 0, 1);
  }
  if (prediction && typeof prediction.delay_risk === "number") {
    return clamp(prediction.delay_risk, 0, 1);
  }
  return null;
};

const exportToBigQuery = async (payload) => {
  const datasetId = process.env.BQ_DATASET;
  const tableId = process.env.BQ_TABLE;
  if (!datasetId || !tableId) {
    return { skipped: true, reason: "Missing dataset/table" };
  }

  const row = {
    shipment_id: payload.shipment_id,
    origin: payload.origin,
    destination: payload.destination,
    distance: payload.distance,
    traffic_level: payload.traffic_level,
    weather_condition: payload.weather_condition,
    estimated_delivery_time: payload.estimated_delivery_time,
    delay_risk: payload.delay_risk,
    created_at: new Date().toISOString()
  };

  await bigquery.dataset(datasetId).table(tableId).insert([row]);
  return { inserted: true };
};

const buildSummaryFromFirestore = async () => {
  const snapshot = await db
    .collection("shipments")
    .orderBy("created_at", "desc")
    .limit(200)
    .get();

  const today = new Date();
  const dayBuckets = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    date.setHours(0, 0, 0, 0);
    return { date, label: date.toLocaleDateString("en-US", { weekday: "short" }) };
  });

  const weekBuckets = Array.from({ length: 4 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (21 - index * 7));
    date.setHours(0, 0, 0, 0);
    const mondayOffset = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - mondayOffset);
    return {
      date,
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    };
  });

  const dayStats = dayBuckets.map(() => ({ sum: 0, count: 0 }));
  const weekStats = weekBuckets.map(() => ({ onTime: 0, delayed: 0 }));
  const distribution = {};
  let deliverySum = 0;
  let deliveryCount = 0;
  let delayedCount = 0;

  snapshot.docs.forEach((docItem) => {
    const data = docItem.data();
    const createdAt = data.created_at ? data.created_at.toDate() : null;
    if (!createdAt) {
      return;
    }

    const delayRisk = Number(data.delay_risk || 0);
    const deliveryTime = Number(data.estimated_delivery_time || 0);
    if (deliveryTime) {
      deliverySum += deliveryTime;
      deliveryCount += 1;
    }
    if (delayRisk > 0.6) {
      delayedCount += 1;
    }

    dayBuckets.forEach((bucket, idx) => {
      const bucketDate = bucket.date;
      if (createdAt >= bucketDate && createdAt < new Date(bucketDate.getTime() + 86400000)) {
        dayStats[idx].sum += delayRisk * 100;
        dayStats[idx].count += 1;
      }
    });

    weekBuckets.forEach((bucket, idx) => {
      const weekStart = bucket.date;
      const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
      if (createdAt >= weekStart && createdAt < weekEnd) {
        if (delayRisk > 0.6) {
          weekStats[idx].delayed += 1;
        } else {
          weekStats[idx].onTime += 1;
        }
      }
    });

    const trafficLevel = (data.traffic_level || "unknown").toLowerCase();
    distribution[trafficLevel] = (distribution[trafficLevel] || 0) + 1;
  });

  return {
    delayTrend: {
      labels: dayBuckets.map((bucket) => bucket.label),
      values: dayStats.map((stat) => (stat.count ? Math.round(stat.sum / stat.count) : 0))
    },
    deliveryPerformance: {
      labels: weekBuckets.map((bucket) => bucket.label),
      onTime: weekStats.map((stat) => stat.onTime),
      delayed: weekStats.map((stat) => stat.delayed)
    },
    distribution: {
      labels: Object.keys(distribution).map((key) => key.charAt(0).toUpperCase() + key.slice(1)),
      values: Object.values(distribution)
    },
    metrics: {
      average_delivery_time: deliveryCount ? deliverySum / deliveryCount : 0,
      delay_frequency: snapshot.size ? delayedCount / snapshot.size : 0
    },
    source: "firestore"
  };
};

const buildSummaryFromBigQuery = async () => {
  const datasetId = process.env.BQ_DATASET;
  const tableId = process.env.BQ_TABLE;
  if (!datasetId || !tableId) {
    return null;
  }

  const tableRef = `\`${datasetId}.${tableId}\``;

  const [trendRows] = await bigquery.query({
    query: `
      SELECT
        DATE(created_at) AS day,
        FORMAT_DATE('%a', DATE(created_at)) AS label,
        AVG(delay_risk) * 100 AS avg_delay
      FROM ${tableRef}
      WHERE DATE(created_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 DAY)
      GROUP BY day, label
      ORDER BY day
    `
  });

  const [performanceRows] = await bigquery.query({
    query: `
      SELECT
        DATE_TRUNC(DATE(created_at), WEEK(MONDAY)) AS week_start,
        FORMAT_DATE('%b %d', DATE_TRUNC(DATE(created_at), WEEK(MONDAY))) AS label,
        SUM(IF(delay_risk > 0.6, 1, 0)) AS delayed,
        SUM(IF(delay_risk <= 0.6, 1, 0)) AS on_time
      FROM ${tableRef}
      WHERE DATE(created_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 28 DAY)
      GROUP BY week_start, label
      ORDER BY week_start
    `
  });

  const [distributionRows] = await bigquery.query({
    query: `
      SELECT
        traffic_level AS label,
        COUNT(1) AS value
      FROM ${tableRef}
      GROUP BY label
      ORDER BY value DESC
    `
  });

  const [metricRows] = await bigquery.query({
    query: `
      SELECT
        AVG(estimated_delivery_time) AS avg_delivery,
        AVG(IF(delay_risk > 0.6, 1, 0)) AS delay_frequency
      FROM ${tableRef}
      WHERE DATE(created_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    `
  });

  const metric = metricRows[0] || {};

  return {
    delayTrend: {
      labels: trendRows.map((row) => row.label),
      values: trendRows.map((row) => Math.round(row.avg_delay || 0))
    },
    deliveryPerformance: {
      labels: performanceRows.map((row) => row.label),
      onTime: performanceRows.map((row) => row.on_time || 0),
      delayed: performanceRows.map((row) => row.delayed || 0)
    },
    distribution: {
      labels: distributionRows.map((row) => row.label || "Unknown"),
      values: distributionRows.map((row) => row.value || 0)
    },
    metrics: {
      average_delivery_time: metric.avg_delivery || 0,
      delay_frequency: metric.delay_frequency || 0
    },
    source: "bigquery"
  };
};

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/shipments", async (req, res) => {
  try {
    const payload = req.body;
    const required = [
      "shipment_id",
      "origin",
      "destination",
      "distance",
      "traffic_level",
      "weather_condition",
      "estimated_delivery_time"
    ];

    for (const field of required) {
      if (payload[field] === undefined || payload[field] === "") {
        return res.status(400).json({ error: `Missing ${field}` });
      }
    }

    const docRef = await db.collection("shipments").add({
      ...payload,
      delay_risk: payload.delay_risk || 0,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ id: docRef.id });
  } catch (error) {
    logger.error("Create shipment failed", error);
    res.status(500).json({ error: "Failed to create shipment" });
  }
});

app.get("/api/shipments", async (req, res) => {
  try {
    const snapshot = await db
      .collection("shipments")
      .orderBy("created_at", "desc")
      .limit(50)
      .get();

    const data = snapshot.docs.map((docItem) => ({
      id: docItem.id,
      ...docItem.data()
    }));

    res.json({ shipments: data });
  } catch (error) {
    logger.error("List shipments failed", error);
    res.status(500).json({ error: "Failed to list shipments" });
  }
});

app.post("/api/predict", async (req, res) => {
  try {
    const { distance, traffic_level, weather_condition } = req.body;
    const vertexRisk = await callVertexAI(distance, traffic_level, weather_condition);
    const delayRisk = vertexRisk ?? heuristicRisk(distance, traffic_level, weather_condition);

    res.json({ delay_risk: delayRisk, source: vertexRisk ? "vertex" : "heuristic" });
  } catch (error) {
    logger.error("Prediction failed", error);
    res.status(500).json({ error: "Prediction failed" });
  }
});

app.post("/api/analytics/export", async (req, res) => {
  try {
    const result = await exportToBigQuery(req.body);
    res.json({ ok: true, result });
  } catch (error) {
    logger.error("BigQuery export failed", error);
    res.status(500).json({ error: "BigQuery export failed" });
  }
});

app.get("/api/analytics/summary", async (req, res) => {
  try {
    let summary = null;
    try {
      summary = await buildSummaryFromBigQuery();
    } catch (error) {
      logger.warn("BigQuery summary failed, falling back", error);
    }

    if (!summary) {
      summary = await buildSummaryFromFirestore();
    }

    res.json(summary);
  } catch (error) {
    logger.error("Analytics summary failed", error);
    res.status(500).json({ error: "Analytics summary failed" });
  }
});

exports.api = onRequest(app);
