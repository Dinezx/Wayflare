import React from "react";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  DoughnutController,
  ArcElement,
  Tooltip,
  Legend
} from "chart.js";

Chart.register(
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  DoughnutController,
  ArcElement,
  Tooltip,
  Legend
);

const useChart = (canvasRef, config) => {
  React.useEffect(() => {
    if (!canvasRef.current) {
      return;
    }
    const chartInstance = new Chart(canvasRef.current, config);
    return () => chartInstance.destroy();
  }, [canvasRef, config]);
};

export function DelayTrendChart({ labels, values }) {
  const canvasRef = React.useRef(null);
  const chartLabels = labels && labels.length ? labels : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const chartValues = values && values.length ? values : [12, 19, 15, 25, 22, 10, 8];

  useChart(canvasRef, {
    type: "line",
    data: {
      labels: chartLabels,
      datasets: [
        {
          label: "Avg Delay Risk %",
          data: chartValues,
          borderColor: "#4285F4",
          backgroundColor: "rgba(66, 133, 244, 0.12)",
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true, grid: { color: "#F1F5F9" } },
        x: { grid: { display: false } }
      }
    }
  });

  return <canvas ref={canvasRef} />;
}

export function DeliveryPerformanceChart({ labels, onTime, delayed }) {
  const canvasRef = React.useRef(null);
  const chartLabels = labels && labels.length ? labels : ["Week 1", "Week 2", "Week 3", "Week 4"];
  const chartOnTime = onTime && onTime.length ? onTime : [320, 350, 310, 380];
  const chartDelayed = delayed && delayed.length ? delayed : [40, 35, 60, 20];

  useChart(canvasRef, {
    type: "bar",
    data: {
      labels: chartLabels,
      datasets: [
        {
          label: "On-Time",
          data: chartOnTime,
          backgroundColor: "#34A853",
          borderRadius: 4
        },
        {
          label: "Delayed",
          data: chartDelayed,
          backgroundColor: "#EA4335",
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, grid: { color: "#F1F5F9" } }
      }
    }
  });

  return <canvas ref={canvasRef} />;
}

export function DistributionChart({ labels, values }) {
  const canvasRef = React.useRef(null);
  const chartLabels = labels && labels.length ? labels : ["West Coast", "East Coast", "Midwest", "South"];
  const chartValues = values && values.length ? values : [35, 25, 20, 20];

  useChart(canvasRef, {
    type: "doughnut",
    data: {
      labels: chartLabels,
      datasets: [
        {
          data: chartValues,
          backgroundColor: ["#4285F4", "#EA4335", "#FBBC05", "#34A853"],
          borderWidth: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "75%",
      plugins: {
        legend: { position: "right" }
      }
    }
  });

  return <canvas ref={canvasRef} />;
}
