import React, { useMemo } from "react";
import { GoogleMap, Marker, DirectionsRenderer, useJsApiLoader } from "@react-google-maps/api";

export default function MapView({ shipments, className, height = "420px" }) {
  const apiKey = import.meta.env.VITE_MAPS_API_KEY;
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey
  });

  const points = useMemo(() => {
    return shipments
      .filter((item) => item.origin_lat && item.origin_lng && item.destination_lat && item.destination_lng)
      .map((item) => ({
        origin: { lat: item.origin_lat, lng: item.origin_lng },
        destination: { lat: item.destination_lat, lng: item.destination_lng },
        id: item.id
      }));
  }, [shipments]);

  const center = points.length
    ? points[0].origin
    : { lat: 37.7749, lng: -122.4194 };

  const directions = useMemo(() => {
    if (!window.google || points.length === 0) {
      return null;
    }
    return new window.google.maps.DirectionsService();
  }, [points.length, isLoaded]);

  const [route, setRoute] = React.useState(null);

  React.useEffect(() => {
    if (!directions || points.length === 0) {
      return;
    }
    directions.route(
      {
        origin: points[0].origin,
        destination: points[0].destination,
        travelMode: window.google.maps.TravelMode.DRIVING
      },
      (result, status) => {
        if (status === "OK") {
          setRoute(result);
        }
      }
    );
  }, [directions, points]);

  if (!isLoaded) {
    return <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">Loading map...</div>;
  }

  return (
    <div className={className}>
      <GoogleMap
        mapContainerStyle={{ width: "100%", height, borderRadius: "16px" }}
        center={center}
        zoom={6}
      >
        {points.map((point) => (
          <React.Fragment key={point.id}>
            <Marker position={point.origin} label="O" />
            <Marker position={point.destination} label="D" />
          </React.Fragment>
        ))}
        {route && <DirectionsRenderer directions={route} />}
      </GoogleMap>
    </div>
  );
}
