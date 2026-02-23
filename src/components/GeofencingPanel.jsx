import React, { useState, useEffect, useRef } from "react";
import { MdAddCircleOutline, MdDelete, MdRefresh, MdMyLocation, MdRadar, MdTouchApp, MdCircle, MdList, MdCheckCircle, MdInfo, MdUndo, MdCheck } from "react-icons/md";

const GeofencingPanel = ({ client, map }) => {
    const [tab, setTab] = useState("create");
    const [projectId, setProjectId] = useState("demo-project");
    const [fenceName, setFenceName] = useState("");
    const [fenceType, setFenceType] = useState("circle");
    const [radius, setRadius] = useState("500");
    const [lat, setLat] = useState("");
    const [lng, setLng] = useState("");
    const [polygonPoints, setPolygonPoints] = useState([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [fenceId, setFenceId] = useState("");
    const [checkLat, setCheckLat] = useState("");
    const [checkLng, setCheckLng] = useState("");
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [pickMode, setPickMode] = useState(false);
    const [createdFences, setCreatedFences] = useState([]);
    const drawHandlerRef = useRef(null);

    // ── Circle: single pick from map ──
    useEffect(() => {
        if (!map || !pickMode || fenceType === "polygon") return;
        const handler = (e) => {
            const { lat: clickLat, lng: clickLng } = e.lngLat;
            if (tab === "check") {
                setCheckLat(clickLat.toFixed(6));
                setCheckLng(clickLng.toFixed(6));
            } else {
                setLat(clickLat.toFixed(6));
                setLng(clickLng.toFixed(6));
            }
            setPickMode(false);
            map.getCanvas().style.cursor = "";
        };
        map.getCanvas().style.cursor = "crosshair";
        map.once("click", handler);
        return () => {
            map.off("click", handler);
            if (map.getCanvas()) map.getCanvas().style.cursor = "";
        };
    }, [map, pickMode, tab, fenceType]);

    // ── Polygon: multi-click drawing mode ──
    useEffect(() => {
        if (!map || !isDrawing || fenceType !== "polygon") return;

        map.getCanvas().style.cursor = "crosshair";
        const handler = (e) => {
            const { lat: clickLat, lng: clickLng } = e.lngLat;
            setPolygonPoints(prev => [...prev, { lat: clickLat, lng: clickLng }]);
        };
        drawHandlerRef.current = handler;
        map.on("click", handler);

        return () => {
            map.off("click", handler);
            if (map.getCanvas()) map.getCanvas().style.cursor = "";
            drawHandlerRef.current = null;
        };
    }, [map, isDrawing, fenceType]);

    const startDrawing = () => {
        setPolygonPoints([]);
        setIsDrawing(true);
    };

    const finishDrawing = () => {
        setIsDrawing(false);
        if (map) map.getCanvas().style.cursor = "";
    };

    const undoLastPoint = () => {
        setPolygonPoints(prev => prev.slice(0, -1));
    };

    const clearPolygon = () => {
        setPolygonPoints([]);
        setIsDrawing(false);
        if (map) map.getCanvas().style.cursor = "";
    };

    // ── Draw circle preview ──
    useEffect(() => {
        if (!map || !lat || !lng || tab !== "create" || fenceType !== "circle") return;
        const centerLat = parseFloat(lat);
        const centerLng = parseFloat(lng);
        const r = parseInt(radius) || 500;
        if (isNaN(centerLat) || isNaN(centerLng)) return;

        const points = 64;
        const coords = [];
        for (let i = 0; i <= points; i++) {
            const angle = (i / points) * 2 * Math.PI;
            const dx = (r / 111320) * Math.cos(angle);
            const dy = (r / (111320 * Math.cos(centerLat * Math.PI / 180))) * Math.sin(angle);
            coords.push([centerLng + dy, centerLat + dx]);
        }

        const sourceId = "geofence-preview";
        const layerFillId = "geofence-preview-fill";
        const layerLineId = "geofence-preview-line";

        try { map.removeLayer(layerFillId); } catch (e) { }
        try { map.removeLayer(layerLineId); } catch (e) { }
        try { map.removeSource(sourceId); } catch (e) { }

        map.addSource(sourceId, {
            type: "geojson",
            data: { type: "Feature", geometry: { type: "Polygon", coordinates: [coords] } },
        });
        map.addLayer({ id: layerFillId, type: "fill", source: sourceId, paint: { "fill-color": "#3b82f6", "fill-opacity": 0.15 } });
        map.addLayer({ id: layerLineId, type: "line", source: sourceId, paint: { "line-color": "#3b82f6", "line-width": 2, "line-dasharray": [3, 2] } });

        return () => {
            try { map.removeLayer(layerFillId); } catch (e) { }
            try { map.removeLayer(layerLineId); } catch (e) { }
            try { map.removeSource(sourceId); } catch (e) { }
        };
    }, [map, lat, lng, radius, tab, fenceType]);

    // ── Draw polygon preview ──
    useEffect(() => {
        if (!map || fenceType !== "polygon" || tab !== "create") return;

        const sourceId = "geofence-polygon-preview";
        const layerFillId = "geofence-polygon-fill";
        const layerLineId = "geofence-polygon-line";
        const pointSourceId = "geofence-polygon-points";
        const pointLayerId = "geofence-polygon-points-layer";

        // Clean first
        try { map.removeLayer(layerFillId); } catch (e) { }
        try { map.removeLayer(layerLineId); } catch (e) { }
        try { map.removeLayer(pointLayerId); } catch (e) { }
        try { map.removeSource(sourceId); } catch (e) { }
        try { map.removeSource(pointSourceId); } catch (e) { }

        if (polygonPoints.length === 0) return;

        const coords = polygonPoints.map(p => [p.lng, p.lat]);

        // Draw points
        map.addSource(pointSourceId, {
            type: "geojson",
            data: {
                type: "FeatureCollection",
                features: polygonPoints.map((p, i) => ({
                    type: "Feature",
                    geometry: { type: "Point", coordinates: [p.lng, p.lat] },
                    properties: { index: i + 1 },
                })),
            },
        });
        map.addLayer({
            id: pointLayerId, type: "circle", source: pointSourceId,
            paint: { "circle-radius": 6, "circle-color": "#3b82f6", "circle-stroke-width": 2, "circle-stroke-color": "#ffffff" },
        });

        // Draw polygon (need at least 3 points)
        if (coords.length >= 3) {
            const closed = [...coords, coords[0]];
            map.addSource(sourceId, {
                type: "geojson",
                data: { type: "Feature", geometry: { type: "Polygon", coordinates: [closed] } },
            });
            map.addLayer({ id: layerFillId, type: "fill", source: sourceId, paint: { "fill-color": "#8b5cf6", "fill-opacity": 0.15 } });
            map.addLayer({ id: layerLineId, type: "line", source: sourceId, paint: { "line-color": "#8b5cf6", "line-width": 2, "line-dasharray": [3, 2] } });
        } else if (coords.length === 2) {
            // Draw a line between 2 points
            map.addSource(sourceId, {
                type: "geojson",
                data: { type: "Feature", geometry: { type: "LineString", coordinates: coords } },
            });
            map.addLayer({ id: layerLineId, type: "line", source: sourceId, paint: { "line-color": "#8b5cf6", "line-width": 2, "line-dasharray": [4, 3] } });
        }

        return () => {
            try { map.removeLayer(layerFillId); } catch (e) { }
            try { map.removeLayer(layerLineId); } catch (e) { }
            try { map.removeLayer(pointLayerId); } catch (e) { }
            try { map.removeSource(sourceId); } catch (e) { }
            try { map.removeSource(pointSourceId); } catch (e) { }
        };
    }, [map, polygonPoints, fenceType, tab]);

    const useMapCenter = (target = "fence") => {
        if (map) {
            const c = map.getCenter();
            if (target === "check") {
                setCheckLat(c.lat.toFixed(6));
                setCheckLng(c.lng.toFixed(6));
            } else {
                setLat(c.lat.toFixed(6));
                setLng(c.lng.toFixed(6));
            }
        }
    };

    const handleAction = async (action) => {
        setLoading(true); setError(""); setResult(null);
        try {
            let res;
            switch (action) {
                case "create": {
                    if (!fenceName || !projectId) { setError("Fill name and project ID"); setLoading(false); return; }
                    let coordinates;
                    if (fenceType === "circle") {
                        if (!lat || !lng) { setError("Set the center point"); setLoading(false); return; }
                        coordinates = [[parseFloat(lat), parseFloat(lng)]];
                    } else {
                        if (polygonPoints.length < 3) { setError("Draw at least 3 points for a polygon"); setLoading(false); return; }
                        coordinates = polygonPoints.map(p => [p.lat, p.lng]);
                    }
                    const data = {
                        name: fenceName, type: fenceType, coordinates,
                        ...(fenceType === "circle" ? { radius: parseInt(radius) } : {}),
                        status: "active", projectId,
                    };
                    res = await client.geofencing.create(data);
                    setResult({ action: "✅ Fence Created", data: res });
                    const newFenceId = res?.id || res?.geofenceId || res?.data?.id;
                    if (newFenceId) {
                        setCreatedFences(prev => [...prev, { id: newFenceId, name: fenceName }]);
                        setFenceId(newFenceId);
                    }
                    break;
                }
                case "get": {
                    if (!fenceId) { setError("Enter fence ID"); setLoading(false); return; }
                    res = await client.geofencing.getById(fenceId);
                    setResult({ action: "📋 Fence Details", data: res });
                    break;
                }
                case "delete": {
                    if (!fenceId) { setError("Enter fence ID"); setLoading(false); return; }
                    res = await client.geofencing.deleteById(fenceId);
                    setResult({ action: "🗑️ Deleted", data: res });
                    setCreatedFences(prev => prev.filter(f => f.id !== fenceId));
                    break;
                }
                case "list": {
                    if (!projectId) { setError("Enter project ID"); setLoading(false); return; }
                    res = await client.geofencing.list(projectId, 1, 20);
                    setResult({ action: "📋 All Fences", data: res });
                    break;
                }
                case "check": {
                    if (!fenceId || !checkLat || !checkLng) { setError("Enter fence ID and coordinates"); setLoading(false); return; }
                    res = await client.geofencing.checkStatus(fenceId, `${checkLat},${checkLng}`);
                    setResult({ action: "📍 Status Check", data: res });
                    break;
                }
            }
        } catch (e) {
            const msg = e.message || "Request failed";
            if (msg.includes("400")) setError("Bad Request — check parameters. Geofencing API may not be enabled for your key.");
            else if (msg.includes("401") || msg.includes("403")) setError("Unauthorized — Geofencing not enabled for your API key.");
            else if (msg.includes("404")) setError("Not found — fence ID doesn't exist.");
            else setError(msg);
        }
        setLoading(false);
    };

    const tabs_list = [
        { id: "create", label: "Create", icon: MdAddCircleOutline },
        { id: "manage", label: "Manage", icon: MdList },
        { id: "check", label: "Check", icon: MdRadar },
    ];

    const inputCls = "w-full px-3 py-2.5 bg-white/50 backdrop-blur-sm rounded-lg text-xs text-gray-800 placeholder-gray-400 border border-white/30 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none transition-all";

    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <h2 className="text-base font-semibold text-gray-800">Geofencing</h2>
            </div>
            <p className="text-xs text-gray-400 mb-3">Create & manage virtual boundary zones</p>

            {/* Project ID */}
            <div className="mb-3">
                <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Project ID</label>
                <input className={inputCls} placeholder="my-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} />
            </div>

            {/* Tabs */}
            <div className="flex bg-gray-100/60 backdrop-blur-sm rounded-lg p-0.5 mb-4">
                {tabs_list.map((t) => (
                    <button key={t.id}
                        className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium rounded-md transition-all ${tab === t.id ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                        onClick={() => { setTab(t.id); setResult(null); setError(""); }}>
                        <t.icon size={14} /> {t.label}
                    </button>
                ))}
            </div>

            {/* ── CREATE ── */}
            {tab === "create" && (
                <div className="space-y-3">
                    <div>
                        <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Fence Name</label>
                        <input className={inputCls} placeholder="My Office Zone" value={fenceName} onChange={(e) => setFenceName(e.target.value)} />
                    </div>

                    {/* Shape */}
                    <div>
                        <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Shape</label>
                        <div className="flex gap-2">
                            {["circle", "polygon"].map((t) => (
                                <button key={t} onClick={() => { setFenceType(t); if (t === "circle") { setPolygonPoints([]); setIsDrawing(false); } }}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg capitalize transition-all ${fenceType === t ? "bg-blue-50 text-blue-600 border border-blue-200" : "bg-white/50 text-gray-500 border border-gray-200"}`}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Circle mode ── */}
                    {fenceType === "circle" && (
                        <>
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Center Point</label>
                                    <div className="flex gap-1">
                                        <button onClick={() => setPickMode(true)}
                                            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all ${pickMode ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                                            <MdTouchApp size={12} /> {pickMode ? "Click map…" : "Pick"}
                                        </button>
                                        <button onClick={() => useMapCenter("fence")}
                                            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 hover:bg-gray-200">
                                            <MdMyLocation size={12} /> Center
                                        </button>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <input className={`flex-1 ${inputCls} font-mono`} placeholder="Latitude" value={lat} onChange={(e) => setLat(e.target.value)} />
                                    <input className={`flex-1 ${inputCls} font-mono`} placeholder="Longitude" value={lng} onChange={(e) => setLng(e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">
                                    Radius: <span className="text-gray-700 font-bold">{radius}m</span>
                                </label>
                                <input type="range" min="50" max="5000" step="50" value={radius} onChange={(e) => setRadius(e.target.value)}
                                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                                <div className="flex justify-between text-[9px] text-gray-400 mt-0.5"><span>50m</span><span>5km</span></div>
                            </div>
                        </>
                    )}

                    {/* ── Polygon mode ── */}
                    {fenceType === "polygon" && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                                    Points ({polygonPoints.length}) {polygonPoints.length < 3 && <span className="text-red-400">— need at least 3</span>}
                                </label>
                            </div>

                            {/* Drawing controls */}
                            <div className="flex gap-2 mb-3">
                                {!isDrawing ? (
                                    <button onClick={startDrawing}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-purple-500 text-white hover:bg-purple-600 transition-all shadow-sm">
                                        <MdTouchApp size={14} /> Start Drawing
                                    </button>
                                ) : (
                                    <button onClick={finishDrawing}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-green-500 text-white hover:bg-green-600 transition-all shadow-sm animate-pulse">
                                        <MdCheck size={14} /> Finish Drawing
                                    </button>
                                )}
                                <button onClick={undoLastPoint} disabled={polygonPoints.length === 0}
                                    className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium bg-white/50 text-gray-600 hover:bg-white/70 border border-gray-200 disabled:opacity-40 transition-all">
                                    <MdUndo size={14} />
                                </button>
                                <button onClick={clearPolygon} disabled={polygonPoints.length === 0}
                                    className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium bg-white/50 text-red-500 hover:bg-red-50 border border-gray-200 disabled:opacity-40 transition-all">
                                    <MdDelete size={14} />
                                </button>
                            </div>

                            {isDrawing && (
                                <div className="bg-purple-50 rounded-lg px-3 py-2 text-[11px] text-purple-700 mb-3 border border-purple-100">
                                    👆 Click on the map to add points. Click "Finish" when done.
                                </div>
                            )}

                            {/* Points list */}
                            {polygonPoints.length > 0 && (
                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                    {polygonPoints.map((p, i) => (
                                        <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-white/40 rounded-lg border border-gray-100 text-xs">
                                            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 text-[10px] font-bold shrink-0">
                                                {i + 1}
                                            </span>
                                            <span className="font-mono text-gray-600 flex-1">{p.lat.toFixed(5)}, {p.lng.toFixed(5)}</span>
                                            <button onClick={() => setPolygonPoints(prev => prev.filter((_, j) => j !== i))}
                                                className="text-gray-300 hover:text-red-500 transition-colors">
                                                <MdDelete size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${loading ? "bg-gray-200/50 text-gray-400" : "bg-blue-500 hover:bg-blue-600 text-white shadow-sm shadow-blue-200"
                            }`}
                        onClick={() => handleAction("create")} disabled={loading}
                    >
                        {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><MdAddCircleOutline size={16} /> Create Geofence</>}
                    </button>
                </div>
            )}

            {/* ── MANAGE ── */}
            {tab === "manage" && (
                <div className="space-y-3">
                    <div>
                        <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Fence ID</label>
                        <input className={inputCls} placeholder="Paste fence ID here" value={fenceId} onChange={(e) => setFenceId(e.target.value)} />
                    </div>
                    {createdFences.length > 0 && (
                        <div>
                            <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Recent Fences</label>
                            <div className="space-y-1">
                                {createdFences.map((f, i) => (
                                    <button key={i} onClick={() => setFenceId(f.id)}
                                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-all ${fenceId === f.id ? "bg-blue-50 border border-blue-200 text-blue-700" : "bg-white/40 border border-gray-100 text-gray-600 hover:bg-white/60"}`}>
                                        <MdCircle size={8} className={fenceId === f.id ? "text-blue-500" : "text-gray-300"} />
                                        <span className="font-medium">{f.name}</span>
                                        <span className="text-[9px] text-gray-400 ml-auto font-mono truncate max-w-[100px]">{f.id}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <button className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-lg text-xs font-medium bg-blue-500 text-white hover:bg-blue-600 transition-all shadow-sm" onClick={() => handleAction("get")} disabled={loading}>
                            <MdRefresh size={14} /> Get
                        </button>
                        <button className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-lg text-xs font-medium bg-red-500 text-white hover:bg-red-600 transition-all shadow-sm" onClick={() => handleAction("delete")} disabled={loading}>
                            <MdDelete size={14} /> Delete
                        </button>
                    </div>
                    <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium bg-white/50 text-gray-700 hover:bg-white/70 transition-all border border-gray-200" onClick={() => handleAction("list")} disabled={loading}>
                        <MdList size={16} /> List All Fences
                    </button>
                </div>
            )}

            {/* ── CHECK ── */}
            {tab === "check" && (
                <div className="space-y-3">
                    <div>
                        <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Fence ID</label>
                        <input className={inputCls} placeholder="Paste fence ID" value={fenceId} onChange={(e) => setFenceId(e.target.value)} />
                    </div>
                    {createdFences.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {createdFences.map((f, i) => (
                                <button key={i} onClick={() => setFenceId(f.id)}
                                    className={`px-2 py-1 rounded-full text-[10px] font-medium transition-all ${fenceId === f.id ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                                    {f.name}
                                </button>
                            ))}
                        </div>
                    )}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Coordinate to check</label>
                            <div className="flex gap-1">
                                <button onClick={() => setPickMode(true)}
                                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all ${pickMode ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                                    <MdTouchApp size={12} /> {pickMode ? "Click map…" : "Pick"}
                                </button>
                                <button onClick={() => useMapCenter("check")}
                                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 hover:bg-gray-200">
                                    <MdMyLocation size={12} /> Center
                                </button>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <input className={`flex-1 ${inputCls} font-mono`} placeholder="Latitude" value={checkLat} onChange={(e) => setCheckLat(e.target.value)} />
                            <input className={`flex-1 ${inputCls} font-mono`} placeholder="Longitude" value={checkLng} onChange={(e) => setCheckLng(e.target.value)} />
                        </div>
                    </div>
                    <button
                        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${loading ? "bg-gray-200/50 text-gray-400" : "bg-blue-500 hover:bg-blue-600 text-white shadow-sm shadow-blue-200"
                            }`}
                        onClick={() => handleAction("check")} disabled={loading}
                    >
                        {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><MdRadar size={16} /> Check if Inside</>}
                    </button>
                </div>
            )}

            {/* Error */}
            {error && <div className="mt-3 text-red-600 text-xs bg-red-50 rounded-lg px-3 py-2.5 border border-red-100">{error}</div>}

            {/* Result */}
            {result && (
                <div className="mt-4 animate-fade-in">
                    <div className="bg-gradient-to-br from-white/60 to-white/40 backdrop-blur-xl rounded-xl p-4 border border-white/30 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                            <MdCheckCircle size={18} className="text-green-500" />
                            <div className="text-sm font-bold text-gray-700">{result.action}</div>
                        </div>
                        <pre className="text-[10px] text-gray-600 overflow-auto whitespace-pre-wrap break-all font-mono max-h-60 bg-gray-50/50 rounded-lg p-2.5 border border-gray-100">
                            {JSON.stringify(result.data, null, 2)}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GeofencingPanel;
