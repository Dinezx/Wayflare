import React, { useState } from "react";

const initialState = {
  shipment_id: "",
  origin: "",
  destination: "",
  distance: "",
  traffic_level: "medium",
  weather_condition: "clear",
  estimated_delivery_time: "",
  origin_lat: "",
  origin_lng: "",
  destination_lat: "",
  destination_lng: ""
};

export default function ShipmentForm({ onSubmit, disabled }) {
  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState({});

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!form.distance || Number(form.distance) <= 0) {
      nextErrors.distance = "Distance must be greater than 0.";
    }
    if (!form.estimated_delivery_time || Number(form.estimated_delivery_time) <= 0) {
      nextErrors.estimated_delivery_time = "Delivery time must be greater than 0.";
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    onSubmit({
      ...form,
      distance: Number(form.distance),
      estimated_delivery_time: Number(form.estimated_delivery_time),
      origin_lat: form.origin_lat ? Number(form.origin_lat) : null,
      origin_lng: form.origin_lng ? Number(form.origin_lng) : null,
      destination_lat: form.destination_lat ? Number(form.destination_lat) : null,
      destination_lng: form.destination_lng ? Number(form.destination_lng) : null
    });
    setForm(initialState);
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-slate-500">Shipment ID</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            value={form.shipment_id}
            onChange={(e) => updateField("shipment_id", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Origin</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            value={form.origin}
            onChange={(e) => updateField("origin", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Destination</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            value={form.destination}
            onChange={(e) => updateField("destination", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Distance (km)</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            type="number"
            min="0"
            step="0.1"
            value={form.distance}
            onChange={(e) => updateField("distance", e.target.value)}
            required
          />
          {errors.distance && (
            <p className="mt-1 text-xs text-red-500">{errors.distance}</p>
          )}
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Traffic Level</label>
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            value={form.traffic_level}
            onChange={(e) => updateField("traffic_level", e.target.value)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Weather</label>
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            value={form.weather_condition}
            onChange={(e) => updateField("weather_condition", e.target.value)}
          >
            <option value="clear">Clear</option>
            <option value="rain">Rain</option>
            <option value="storm">Storm</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Estimated Delivery Time (hours)</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            type="number"
            min="0"
            step="0.1"
            value={form.estimated_delivery_time}
            onChange={(e) => updateField("estimated_delivery_time", e.target.value)}
            required
          />
          {errors.estimated_delivery_time && (
            <p className="mt-1 text-xs text-red-500">{errors.estimated_delivery_time}</p>
          )}
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Origin Lat (optional)</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            type="number"
            step="0.0001"
            value={form.origin_lat}
            onChange={(e) => updateField("origin_lat", e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Origin Lng (optional)</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            type="number"
            step="0.0001"
            value={form.origin_lng}
            onChange={(e) => updateField("origin_lng", e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Destination Lat (optional)</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            type="number"
            step="0.0001"
            value={form.destination_lat}
            onChange={(e) => updateField("destination_lat", e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Destination Lng (optional)</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            type="number"
            step="0.0001"
            value={form.destination_lng}
            onChange={(e) => updateField("destination_lng", e.target.value)}
          />
        </div>
      </div>
      <button
        className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        type="submit"
        disabled={disabled}
      >
        Save Shipment
      </button>
    </form>
  );
}
