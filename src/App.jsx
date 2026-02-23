import { useState, useEffect, useCallback, useRef } from "react";
import { Map as MapLibreMap, NavigationControl, Marker, Popup, LngLatBounds } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import OlaMapsClient from "ola-map-sdk";

import Sidebar from "./components/Sidebar";
import SearchPanel from "./components/SearchPanel";
import DirectionsPanel from "./components/DirectionsPanel";
import NearbyPanel from "./components/NearbyPanel";
import ElevationPanel from "./components/ElevationPanel";
import GeocodePanel from "./components/GeocodePanel";
import StyleSwitcher from "./components/StyleSwitcher";
import TextSearchPanel from "./components/TextSearchPanel";
import RoadsPanel from "./components/RoadsPanel";
import DistanceMatrixPanel from "./components/DistanceMatrixPanel";
import RouteOptimizerPanel from "./components/RouteOptimizerPanel";
import GeofencingPanel from "./components/GeofencingPanel";
import StaticMapPanel from "./components/StaticMapPanel";
import MapContextMenu from "./components/MapContextMenu";
import DistanceDuration from "./components/DistanceDuration";
import RecenterButton from "./components/RecenterButton";

const API_KEY = import.meta.env.VITE_API_KEY;
const DEFAULT_STYLE = "default-light-standard";

// ── Popup HTML builder ─────────────────────────────
function buildPopupHTML(name, address, components, lat, lng) {
  return `
    <div style="font-family:Inter,sans-serif;padding:8px 4px;max-width:260px;">
      <div style="font-size:14px;font-weight:600;color:#1f2937;margin-bottom:4px;line-height:1.3;">${name}</div>
      ${address && address !== name ? `<div style="font-size:11px;color:#6b7280;margin-bottom:8px;line-height:1.4;">${address}</div>` : ""}
      ${components && components.length > 0 ? `
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">
          ${components.map(c => `<span style="padding:2px 8px;background:#eff6ff;border:1px solid #dbeafe;border-radius:12px;font-size:10px;color:#3b82f6;font-weight:500;">${c.long_name || c}</span>`).join("")}
        </div>
      ` : ""}
      <div style="font-size:10px;color:#9ca3af;font-family:ui-monospace,monospace;margin-bottom:10px;background:#f9fafb;padding:4px 8px;border-radius:6px;">${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
      <button onclick="window.__mapDirectionsTo(${lat},${lng},'${(name || "").replace(/'/g, "\\'").replace(/"/g, "&quot;")}')"
        style="width:100%;padding:8px 0;background:#3b82f6;color:white;border:none;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer;font-family:Inter,sans-serif;"
        onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
        ↗ Directions
      </button>
    </div>
  `;
}

function buildLoadingHTML() {
  return `
    <div style="font-family:Inter,sans-serif;padding:12px 8px;display:flex;align-items:center;gap:8px;">
      <div style="width:16px;height:16px;border:2px solid #e5e7eb;border-top-color:#3b82f6;border-radius:50%;animation:spin 0.6s linear infinite;"></div>
      <span style="color:#6b7280;font-size:12px;">Loading place details…</span>
    </div>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
  `;
}

function App() {
  const clientRef = useRef(new OlaMapsClient(API_KEY));
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [activePanel, setActivePanel] = useState("search");
  const [currentStyle, setCurrentStyle] = useState(DEFAULT_STYLE);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Markers
  const markersRef = useRef([]);

  // Route display
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");

  // Context menu
  const [contextMenu, setContextMenu] = useState(null);
  const [contextCoords, setContextCoords] = useState(null);

  // Directions
  const [directionsTarget, setDirectionsTarget] = useState(null);
  const [directionsOrigin, setDirectionsOrigin] = useState(null);

  // ── Helper: show popup at coords with reverse geocode ──
  const showReverseGeocodePopup = useCallback(async (mapInstance, lat, lng) => {
    const popup = new Popup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: "300px",
      offset: 25,
      className: "custom-popup",
    })
      .setLngLat([lng, lat])
      .setHTML(buildLoadingHTML())
      .addTo(mapInstance);

    try {
      const client = clientRef.current;
      const res = await client.places.reverseGeocode(lat, lng);
      if (res.results && res.results.length > 0) {
        const place = res.results[0];
        const name = place.name || place.formatted_address || "Unknown place";
        const address = place.formatted_address || "";
        const components = (place.address_components || []).slice(0, 3);
        popup.setHTML(buildPopupHTML(name, address, components, lat, lng));
      } else {
        popup.setHTML(buildPopupHTML("Dropped Pin", "", null, lat, lng));
      }
    } catch (err) {
      popup.setHTML(buildPopupHTML("Dropped Pin", "", null, lat, lng));
    }

    return popup;
  }, []);

  // ── Initialise map ──────────────────────────────
  useEffect(() => {
    if (mapRef.current) return;
    const client = clientRef.current;

    const newMap = new MapLibreMap(
      client.getMapOptions({
        container: mapContainerRef.current,
        style: DEFAULT_STYLE,
        center: [77.61, 12.93],
        zoom: 12,
      })
    );

    newMap.addControl(
      new NavigationControl({ visualizePitch: true, showCompass: true }),
      "bottom-right"
    );

    newMap.on("load", () => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { longitude, latitude } = pos.coords;
            setUserLocation({ lng: longitude, lat: latitude });
            new Marker({ color: "#4285F4", scale: 0.8 })
              .setLngLat([longitude, latitude])
              .addTo(newMap);
            newMap.flyTo({ center: [longitude, latitude], zoom: 14 });
          },
          () => { },
          { enableHighAccuracy: true }
        );
      }
    });

    // Click on map → detect POI features from map tiles
    newMap.on("click", (e) => {
      setContextMenu(null);

      // Query all rendered features at the click point
      const features = newMap.queryRenderedFeatures(e.point);

      // Find a POI feature (symbol layer with a name)
      const poi = features.find(f =>
        f.layer.type === "symbol" && (f.properties.name || f.properties.name_en)
      );

      if (poi) {
        const name = poi.properties.name || poi.properties.name_en || "Unknown";
        const lat = e.lngLat.lat;
        const lng = e.lngLat.lng;

        // Clear old markers and place a new one with popup
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];

        const marker = new Marker({ color: "#EA4335", scale: 1 })
          .setLngLat([lng, lat])
          .addTo(newMap);

        const popup = new Popup({
          closeButton: true,
          closeOnClick: false,
          maxWidth: "300px",
          offset: 25,
          className: "custom-popup",
        }).setHTML(buildLoadingHTML());

        marker.setPopup(popup);
        markersRef.current.push(marker);

        // Open popup and fetch details
        marker.togglePopup();

        (async () => {
          try {
            const res = await clientRef.current.places.reverseGeocode(lat, lng);
            if (res.results && res.results.length > 0) {
              const place = res.results[0];
              const fullName = place.name || name;
              const address = place.formatted_address || "";
              const components = (place.address_components || []).slice(0, 3);
              popup.setHTML(buildPopupHTML(fullName, address, components, lat, lng));
            } else {
              popup.setHTML(buildPopupHTML(name, "", null, lat, lng));
            }
          } catch (_) {
            popup.setHTML(buildPopupHTML(name, "", null, lat, lng));
          }
        })();
      }
    });

    // Change cursor on hoverable POIs
    newMap.on("mousemove", (e) => {
      const features = newMap.queryRenderedFeatures(e.point);
      const hasPoi = features.some(f =>
        f.layer.type === "symbol" && (f.properties.name || f.properties.name_en)
      );
      newMap.getCanvas().style.cursor = hasPoi ? "pointer" : "";
    });

    // Right-click context menu
    newMap.on("contextmenu", (e) => {
      e.preventDefault();
      setContextMenu({ x: e.point.x, y: e.point.y });
      setContextCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    mapRef.current = newMap;
    setMap(newMap);

    return () => {
      mapRef.current = null;
      try { newMap.remove(); } catch (e) { /* React strict mode cleanup */ }
    };
  }, []);

  // ── Global callback for popup direction buttons ──
  useEffect(() => {
    window.__mapDirectionsTo = (lat, lng, name) => {
      // Close all popups on markers
      markersRef.current.forEach(m => { if (m.getPopup()?.isOpen()) m.togglePopup(); });
      setDirectionsTarget({ lat, lng, name });
      setActivePanel("directions");
    };
    return () => { delete window.__mapDirectionsTo; };
  }, []);

  // ── Helpers ─────────────────────────────────────
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
  }, []);

  const placeMarker = useCallback(
    (lat, lng, color = "#EA4335", showPopup = true) => {
      const currentMap = mapRef.current;
      if (!currentMap) return;

      // Create standard MapLibre marker (guaranteed popup support)
      const marker = new Marker({ color, scale: 1 })
        .setLngLat([lng, lat])
        .addTo(currentMap);

      // Create popup and attach it
      const popup = new Popup({
        closeButton: true,
        closeOnClick: false,
        maxWidth: "300px",
        offset: 25,
        className: "custom-popup",
      }).setHTML(buildLoadingHTML());

      marker.setPopup(popup);

      // Fetch reverse geocode when popup opens
      let fetched = false;
      popup.on("open", async () => {
        if (fetched) return;
        fetched = true;
        try {
          const client = clientRef.current;
          const res = await client.places.reverseGeocode(lat, lng);
          if (res.results && res.results.length > 0) {
            const place = res.results[0];
            const name = place.name || place.formatted_address || "Dropped Pin";
            const address = place.formatted_address || "";
            const components = (place.address_components || []).slice(0, 3);
            popup.setHTML(buildPopupHTML(name, address, components, lat, lng));
          } else {
            popup.setHTML(buildPopupHTML("Dropped Pin", "", null, lat, lng));
          }
        } catch (_) {
          popup.setHTML(buildPopupHTML("Dropped Pin", "", null, lat, lng));
        }
      });

      markersRef.current.push(marker);

      // Automatically open popup right away
      if (showPopup) {
        marker.togglePopup();
      }

      return marker;
    },
    []
  );

  const flyTo = useCallback(
    (lat, lng, zoom = 15) => {
      const currentMap = mapRef.current;
      if (!currentMap) return;
      currentMap.flyTo({ center: [lng, lat], zoom, duration: 1200 });
    },
    []
  );

  // ── Place select ────────────────────────────────
  const handlePlaceSelect = useCallback(
    ({ lat, lng }) => {
      clearMarkers();
      placeMarker(lat, lng, "#EA4335", true);
      flyTo(lat, lng);
    },
    [clearMarkers, placeMarker, flyTo]
  );

  // ── Directions from search ──────────────────────
  const handleDirectionsTo = useCallback(
    (place) => {
      setDirectionsOrigin(null);
      setDirectionsTarget(place);
      setActivePanel("directions");
    },
    []
  );

  // ── Directions route result ─────────────────────
  const handleRouteResult = useCallback(
    (route, origin, destination) => {
      const currentMap = mapRef.current;
      if (!currentMap) return;
      const leg = route.legs[0];
      setDistance(leg.readable_distance || "");
      setDuration(leg.readable_duration || "");

      const geometry = route.overview_polyline || route.geometry;
      if (geometry) {
        let coords;
        if (typeof geometry === "string") {
          coords = decodePolyline(geometry);
        } else if (geometry.coordinates) {
          coords = geometry.coordinates;
        }

        if (coords && coords.length > 0) {
          if (currentMap.getLayer("route-line")) currentMap.removeLayer("route-line");
          if (currentMap.getLayer("route-outline")) currentMap.removeLayer("route-outline");
          if (currentMap.getSource("route")) currentMap.removeSource("route");

          currentMap.addSource("route", {
            type: "geojson",
            data: { type: "Feature", geometry: { type: "LineString", coordinates: coords } },
          });

          currentMap.addLayer({
            id: "route-outline",
            type: "line",
            source: "route",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#1a73e8", "line-width": 8, "line-opacity": 0.3 },
          });

          currentMap.addLayer({
            id: "route-line",
            type: "line",
            source: "route",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#4285F4", "line-width": 5, "line-opacity": 1 },
          });

          const bounds = coords.reduce(
            (b, c) => b.extend(c),
            new LngLatBounds(coords[0], coords[0])
          );
          currentMap.fitBounds(bounds, { padding: { top: 80, bottom: 80, left: 420, right: 80 } });
        }
      }

      clearMarkers();
      // Green origin, red destination — no auto-popup on route markers
      placeMarker(origin.lat, origin.lng, "#34A853", false);
      placeMarker(destination.lat, destination.lng, "#EA4335", false);
    },
    [clearMarkers, placeMarker]
  );

  // ── Polyline decoder ────────────────────────────
  function decodePolyline(encoded) {
    const coords = [];
    let index = 0, lat = 0, lng = 0;
    while (index < encoded.length) {
      let b, shift = 0, result = 0;
      do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      lat += result & 1 ? ~(result >> 1) : result >> 1;
      shift = 0; result = 0;
      do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      lng += result & 1 ? ~(result >> 1) : result >> 1;
      coords.push([lng / 1e5, lat / 1e5]);
    }
    return coords;
  }

  // ── Context menu actions ────────────────────────
  const handleContextAction = useCallback(
    async (action, lngLat) => {
      const client = clientRef.current;
      const currentMap = mapRef.current;

      switch (action) {
        case "whats-here":
          setContextCoords({ lat: lngLat.lat, lng: lngLat.lng });
          setActivePanel("geocode");
          // Also drop a marker with popup
          clearMarkers();
          placeMarker(lngLat.lat, lngLat.lng, "#EA4335", true);
          break;

        case "elevation":
          setContextCoords({ lat: lngLat.lat, lng: lngLat.lng });
          setActivePanel("elevation");
          break;

        case "directions-from": {
          let name = `${lngLat.lat.toFixed(5)}, ${lngLat.lng.toFixed(5)}`;
          try {
            const res = await client.places.reverseGeocode(lngLat.lat, lngLat.lng);
            if (res.results?.[0]) {
              name = res.results[0].name || res.results[0].formatted_address || name;
            }
          } catch (e) { }
          setDirectionsOrigin({ lat: lngLat.lat, lng: lngLat.lng, name });
          setDirectionsTarget(null);
          setActivePanel("directions");
          break;
        }

        case "directions-to": {
          let name = `${lngLat.lat.toFixed(5)}, ${lngLat.lng.toFixed(5)}`;
          try {
            const res = await client.places.reverseGeocode(lngLat.lat, lngLat.lng);
            if (res.results?.[0]) {
              name = res.results[0].name || res.results[0].formatted_address || name;
            }
          } catch (e) { }
          setDirectionsOrigin(null);
          setDirectionsTarget({ lat: lngLat.lat, lng: lngLat.lng, name });
          setActivePanel("directions");
          break;
        }
      }
    },
    [clearMarkers, placeMarker]
  );

  // ── Recenter ────────────────────────────────────
  const handleRecenter = useCallback(() => {
    const currentMap = mapRef.current;
    if (currentMap && userLocation) {
      currentMap.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 15, duration: 1200 });
    }
  }, [userLocation]);

  // ── Render panel ────────────────────────────────
  const renderPanel = () => {
    const client = clientRef.current;
    switch (activePanel) {
      case "search":
        return <SearchPanel client={client} map={map} onPlaceSelect={handlePlaceSelect} onDirectionsTo={handleDirectionsTo} />;
      case "directions":
        return (
          <DirectionsPanel
            client={client}
            map={map}
            userLocation={userLocation}
            onRouteResult={handleRouteResult}
            initialDestination={directionsTarget}
            initialOrigin={directionsOrigin}
          />
        );
      case "nearby":
        return <NearbyPanel client={client} map={map} onPlaceSelect={handlePlaceSelect} />;
      case "elevation":
        return <ElevationPanel client={client} map={map} contextCoords={contextCoords} />;
      case "geocode":
        return <GeocodePanel client={client} map={map} onPlaceSelect={handlePlaceSelect} contextCoords={contextCoords} />;
      case "styles":
        return <StyleSwitcher client={client} map={map} currentStyle={currentStyle} onStyleChange={setCurrentStyle} />;
      case "textsearch":
        return <TextSearchPanel client={client} map={map} onPlaceSelect={handlePlaceSelect} />;
      case "roads":
        return <RoadsPanel client={client} map={map} />;
      case "matrix":
        return <DistanceMatrixPanel client={client} />;
      case "optimizer":
        return <RouteOptimizerPanel client={client} map={map} onRouteResult={handleRouteResult} />;
      case "geofencing":
        return <GeofencingPanel client={client} map={map} />;
      case "staticmap":
        return <StaticMapPanel client={client} map={map} currentStyle={currentStyle} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden relative bg-gray-100">
      <div ref={mapContainerRef} className="w-full h-full" />

      <Sidebar
        activePanel={activePanel}
        setActivePanel={(p) => { setActivePanel(p); setDirectionsTarget(null); setDirectionsOrigin(null); }}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      >
        {renderPanel()}
      </Sidebar>

      <DistanceDuration distance={distance} duration={duration} />
      <RecenterButton handleRecenter={handleRecenter} />

      {contextMenu && (
        <MapContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          lngLat={contextCoords}
          onClose={() => setContextMenu(null)}
          onAction={handleContextAction}
        />
      )}
    </div>
  );
}

export default App;
