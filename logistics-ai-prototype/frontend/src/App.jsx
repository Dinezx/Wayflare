import React from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc
} from "firebase/firestore";
import { auth, provider, db } from "./firebase";
import ShipmentForm from "./components/ShipmentForm.jsx";
import Dashboard from "./components/Dashboard.jsx";
import MapView from "./components/MapView.jsx";
import { DelayTrendChart, DeliveryPerformanceChart, DistributionChart } from "./components/Charts.jsx";

const functionsBaseUrl = import.meta.env.VITE_FUNCTIONS_BASE_URL || "/api";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "shipments", label: "Shipments", icon: "view_list" },
  { id: "map", label: "Map Tracking", icon: "map" },
  { id: "alerts", label: "AI Risk Alerts", icon: "warning" },
  { id: "analytics", label: "Analytics", icon: "analytics" },
  { id: "settings", label: "Settings", icon: "settings" }
];

export default function App() {
  const [user, setUser] = React.useState(null);
  const [shipments, setShipments] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [activeView, setActiveView] = React.useState("dashboard");
  const [modalOpen, setModalOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [trafficFilter, setTrafficFilter] = React.useState("all");
  const [riskFilter, setRiskFilter] = React.useState("all");
  const [analytics, setAnalytics] = React.useState({
    delayTrend: { labels: [], values: [] },
    deliveryPerformance: { labels: [], onTime: [], delayed: [] },
    distribution: { labels: [], values: [] },
    metrics: { average_delivery_time: 0, delay_frequency: 0 }
  });

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    const q = query(collection(db, "shipments"), orderBy("created_at", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data()
      }));
      setShipments(results);
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const response = await fetch(`${functionsBaseUrl}/analytics/summary`);
        const data = await response.json();
        if (data && data.delayTrend) {
          setAnalytics(data);
        }
      } catch (error) {
        console.error("Failed to load analytics", error);
      }
    };
    if (user) {
      loadAnalytics();
    }
  }, [user, shipments.length]);

  const handleSignIn = () => signInWithPopup(auth, provider);
  const handleSignOut = () => signOut(auth);

  const handleCreateShipment = async (payload) => {
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, "shipments"), {
        ...payload,
        delay_risk: 0,
        created_at: serverTimestamp()
      });

      const predictResp = await fetch(`${functionsBaseUrl}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          distance: payload.distance,
          traffic_level: payload.traffic_level,
          weather_condition: payload.weather_condition
        })
      });

      const predictData = await predictResp.json();
      const delayRisk = predictData.delay_risk || 0;

      await updateDoc(doc(db, "shipments", docRef.id), {
        delay_risk: delayRisk
      });

      await fetch(`${functionsBaseUrl}/analytics/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          delay_risk: delayRisk
        })
      });
    } finally {
      setLoading(false);
      setModalOpen(false);
    }
  };

  const handleDeleteShipment = async (shipmentId) => {
    if (!window.confirm("Delete this shipment?")) {
      return;
    }
    await deleteDoc(doc(db, "shipments", shipmentId));
  };

  const normalizedQuery = searchTerm.trim().toLowerCase();
  const filteredShipments = shipments.filter((item) => {
    const matchesSearch = !normalizedQuery
      || [item.shipment_id, item.origin, item.destination]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    const matchesTraffic = trafficFilter === "all" || item.traffic_level === trafficFilter;
    const riskValue = Number(item.delay_risk || 0);
    const matchesRisk = riskFilter === "all"
      || (riskFilter === "high" && riskValue > 0.6)
      || (riskFilter === "low" && riskValue <= 0.6);
    return matchesSearch && matchesTraffic && matchesRisk;
  });

  const highRiskShipments = shipments.filter((item) => (item.delay_risk || 0) > 0.6);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-600">
      <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white px-4 py-6 lg:flex">
        <div className="flex items-center gap-2 px-2 pb-6">
          <span className="material-symbols-rounded text-blue-600">local_shipping</span>
          <span className="text-lg font-semibold text-slate-900">LogisAI</span>
        </div>
        <nav className="space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                activeView === item.id
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
              onClick={() => setActiveView(item.id)}
            >
              <span className="material-symbols-rounded text-lg">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500">
            <span className="material-symbols-rounded text-base">search</span>
            <input
              className="w-72 bg-transparent text-sm text-slate-700 focus:outline-none"
              placeholder="Search shipments, routes, or IDs..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <div className="flex items-center gap-4">
            <button className="relative rounded-full p-2 text-slate-500 hover:bg-slate-50">
              <span className="material-symbols-rounded">notifications</span>
              <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                3
              </span>
            </button>
            {user ? (
              <button
                onClick={handleSignOut}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                {user.displayName}
              </button>
            ) : (
              <button
                onClick={handleSignIn}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
              >
                Sign in with Google
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 space-y-6 overflow-y-auto p-6">
          {!user ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              Sign in to manage shipments and view analytics.
            </div>
          ) : (
            <>
              {activeView === "dashboard" && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-semibold text-slate-900">Overview Dashboard</h1>
                      <p className="text-sm text-slate-500">
                        AI-driven insights and real-time logistics monitoring.
                      </p>
                    </div>
                    <button
                      onClick={() => setModalOpen(true)}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                    >
                      <span className="material-symbols-rounded text-base">add</span>
                      Add Shipment
                    </button>
                  </div>

                  <Dashboard shipments={shipments} />

                  <div className="grid gap-6 xl:grid-cols-3">
                    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm xl:col-span-2">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-900">Live Tracking</h2>
                        <button className="rounded-full p-1 text-slate-400 hover:bg-slate-50">
                          <span className="material-symbols-rounded text-base">open_in_full</span>
                        </button>
                      </div>
                      <div className="mt-4">
                        <MapView shipments={shipments} height="320px" />
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                      <h2 className="text-lg font-semibold text-slate-900">Delay Prediction Trends</h2>
                      <div className="mt-4 h-64">
                        <DelayTrendChart
                          labels={analytics.delayTrend.labels}
                          values={analytics.delayTrend.values}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeView === "shipments" && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold text-slate-900">All Shipments</h1>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                      <span className="material-symbols-rounded text-base">filter_list</span>
                      <select
                        className="bg-transparent text-xs text-slate-600 focus:outline-none"
                        value={trafficFilter}
                        onChange={(event) => setTrafficFilter(event.target.value)}
                      >
                        <option value="all">All Traffic</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                      <span className="material-symbols-rounded text-base">warning</span>
                      <select
                        className="bg-transparent text-xs text-slate-600 focus:outline-none"
                        value={riskFilter}
                        onChange={(event) => setRiskFilter(event.target.value)}
                      >
                        <option value="all">All Risk</option>
                        <option value="high">High Risk</option>
                        <option value="low">Low Risk</option>
                      </select>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="text-xs uppercase text-slate-400">
                          <tr>
                            <th className="px-3 py-2">Shipment ID</th>
                            <th className="px-3 py-2">Origin to Destination</th>
                            <th className="px-3 py-2">Traffic / Weather</th>
                            <th className="px-3 py-2">Delay Risk</th>
                            <th className="px-3 py-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredShipments.map((item) => (
                            <tr key={item.id}>
                              <td className="px-3 py-3 text-sm font-semibold text-blue-600">
                                {item.shipment_id}
                              </td>
                              <td className="px-3 py-3">
                                <div className="font-medium text-slate-800">{item.origin}</div>
                                <div className="text-xs text-slate-500">to {item.destination}</div>
                              </td>
                              <td className="px-3 py-3 text-xs text-slate-500">
                                Traffic: {item.traffic_level} | Weather: {item.weather_condition}
                              </td>
                              <td className="px-3 py-3 text-sm font-semibold text-slate-700">
                                {Math.round((item.delay_risk || 0) * 100)}%
                              </td>
                              <td className="px-3 py-3">
                                <button
                                  className="text-xs font-semibold text-red-500 hover:text-red-600"
                                  onClick={() => handleDeleteShipment(item.id)}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {filteredShipments.length === 0 && (
                      <p className="px-3 py-6 text-center text-sm text-slate-500">
                        No shipments match your filters.
                      </p>
                    )}
                  </div>
                </section>
              )}

              {activeView === "map" && (
                <section className="space-y-4">
                  <h1 className="text-2xl font-semibold text-slate-900">Fleet Tracking Map</h1>
                  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <MapView shipments={shipments} height="520px" />
                  </div>
                </section>
              )}

              {activeView === "alerts" && (
                <section className="space-y-4">
                  <h1 className="text-2xl font-semibold text-slate-900">AI Risk Analysis Center</h1>
                  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    {highRiskShipments.length === 0 ? (
                      <p className="text-sm text-slate-500">No high-risk shipments detected.</p>
                    ) : (
                      <div className="space-y-3">
                        {highRiskShipments.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50/60 px-4 py-3"
                          >
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                Shipment {item.shipment_id} 
                              </p>
                              <p className="text-xs text-slate-600">
                                {item.origin} to {item.destination}
                              </p>
                            </div>
                            <span className="text-sm font-semibold text-red-600">
                              {Math.round((item.delay_risk || 0) * 100)}% risk
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {activeView === "analytics" && (
                <section className="space-y-4">
                  <h1 className="text-2xl font-semibold text-slate-900">Performance Analytics</h1>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                      <p className="text-sm text-slate-500">Average Delivery Time</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">
                        {analytics.metrics.average_delivery_time
                          ? analytics.metrics.average_delivery_time.toFixed(1)
                          : "0.0"} hours
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                      <p className="text-sm text-slate-500">Delay Frequency</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">
                        {analytics.metrics.delay_frequency
                          ? Math.round(analytics.metrics.delay_frequency * 100)
                          : 0}%
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-6 xl:grid-cols-2">
                    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                      <h2 className="text-lg font-semibold text-slate-900">Delivery Performance</h2>
                      <div className="mt-4 h-72">
                        <DeliveryPerformanceChart
                          labels={analytics.deliveryPerformance.labels}
                          onTime={analytics.deliveryPerformance.onTime}
                          delayed={analytics.deliveryPerformance.delayed}
                        />
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                      <h2 className="text-lg font-semibold text-slate-900">Shipment Distribution</h2>
                      <div className="mt-4 h-72">
                        <DistributionChart
                          labels={analytics.distribution.labels}
                          values={analytics.distribution.values}
                        />
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {activeView === "settings" && (
                <section className="space-y-4">
                  <h1 className="text-2xl font-semibold text-slate-900">Platform Settings</h1>
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                    Settings module under construction.
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Create New Shipment</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-full p-1 text-slate-500 hover:bg-slate-50"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            <div className="mt-4">
              <ShipmentForm onSubmit={handleCreateShipment} disabled={loading} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
