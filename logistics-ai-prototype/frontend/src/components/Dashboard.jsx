import React from "react";

export default function Dashboard({ shipments }) {
  const totalShipments = shipments.length;
  const highRiskList = shipments.filter((item) => (item.delay_risk || 0) > 0.6);
  const highRisk = highRiskList.length;
  const onTimeRate = totalShipments
    ? Math.round(((totalShipments - highRisk) / totalShipments) * 1000) / 10
    : 0;
  const riskBadge = (risk) => {
    if (risk > 0.6) {
      return "bg-red-50 text-red-600 border-red-100";
    }
    if (risk > 0.3) {
      return "bg-yellow-50 text-yellow-700 border-yellow-100";
    }
    return "bg-green-50 text-green-600 border-green-100";
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
              <span className="material-symbols-rounded">inventory_2</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Shipments</p>
              <p className="text-2xl font-semibold text-slate-900">{totalShipments}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-green-50 p-2 text-green-600">
              <span className="material-symbols-rounded">local_shipping</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Active Shipments</p>
              <p className="text-2xl font-semibold text-slate-900">{totalShipments}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-red-50 p-2 text-red-600">
              <span className="material-symbols-rounded">warning</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">High Risk</p>
              <p className="text-2xl font-semibold text-slate-900">{highRisk}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-yellow-50 p-2 text-yellow-600">
              <span className="material-symbols-rounded">check_circle</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">On-Time Rate</p>
              <p className="text-2xl font-semibold text-slate-900">{onTimeRate}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">AI Risk Alerts</h2>
            <button className="text-sm font-medium text-blue-600">View All</button>
          </div>
          <div className="mt-4 space-y-3">
            {highRiskList.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                No high-risk shipments yet. Monitoring routes in real time.
              </div>
            )}
            {highRiskList.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-red-50 p-2 text-red-600">
                    <span className="material-symbols-rounded">warning</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      High Delay Risk Detected
                    </p>
                    <p className="text-sm text-slate-500">
                      Shipment {item.shipment_id} from {item.origin} to {item.destination} at {Math.round((item.delay_risk || 0) * 100)}% delay risk.
                    </p>
                  </div>
                </div>
                <button className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600">
                  Reroute
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Active Shipments</h2>
          <div className="mt-4 space-y-3">
            {shipments.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                Shipments will appear here once created.
              </div>
            )}
            {shipments.slice(0, 4).map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-100 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-blue-600">{item.shipment_id}</span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${riskBadge(item.delay_risk || 0)}`}
                  >
                    {Math.round((item.delay_risk || 0) * 100)}% risk
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-700">
                  {item.origin} to {item.destination}
                </p>
                <p className="text-xs text-slate-500">
                  Traffic: {item.traffic_level} | Weather: {item.weather_condition}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Active Shipments Table</h2>
          <div className="flex items-center gap-2 text-slate-400">
            <span className="material-symbols-rounded text-base">filter_list</span>
            <span className="material-symbols-rounded text-base">more_vert</span>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-2">Shipment ID</th>
                <th className="px-3 py-2">Origin to Destination</th>
                <th className="px-3 py-2">Traffic / Weather</th>
                <th className="px-3 py-2">Delay Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shipments.slice(0, 6).map((item) => (
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
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${riskBadge(item.delay_risk || 0)}`}
                    >
                      {Math.round((item.delay_risk || 0) * 100)}% risk
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {shipments.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-slate-500">
              No shipments yet. Create your first shipment to populate the table.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
