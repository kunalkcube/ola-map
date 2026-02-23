import React, { useState, useEffect } from "react";
import { MdImage, MdDownload, MdTouchApp, MdDelete } from "react-icons/md";

const StaticMapPanel = ({ client, map, currentStyle }) => {
    const [tab, setTab] = useState("center");
    const [width, setWidth] = useState("800");
    const [height, setHeight] = useState("600");
    const [format, setFormat] = useState("png");
    const [style, setStyle] = useState(currentStyle || "default-light-standard");
    const [zoom, setZoom] = useState("15");
    const [markerCoords, setMarkerCoords] = useState("");
    const [imageUrl, setImageUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Bounding box state
    const [pickMode, setPickMode] = useState(false);
    const [bboxPoints, setBboxPoints] = useState([]); // Array of 2 points: [SW, NE]
    const [boxRatio, setBoxRatio] = useState(null);
    const [autoRatio, setAutoRatio] = useState(true);

    // ── Click map to set bounds ──
    useEffect(() => {
        if (!map || !pickMode || tab !== "bbox") return;

        map.getCanvas().style.cursor = "crosshair";
        const handler = (e) => {
            const { lat, lng } = e.lngLat;
            setBboxPoints(prev => {
                if (prev.length >= 2) return [{ lat, lng }]; // Reset if 2 points already picked
                return [...prev, { lat, lng }];
            });
            if (bboxPoints.length === 1) {
                setPickMode(false);
                map.getCanvas().style.cursor = "";
            }
        };
        map.on("click", handler);

        return () => {
            map.off("click", handler);
            if (map.getCanvas()) map.getCanvas().style.cursor = "";
        };
    }, [map, pickMode, tab, bboxPoints.length]);

    // ── Draw bounding box preview ──
    useEffect(() => {
        if (!map || tab !== "bbox") return;

        const fillId = "staticmap-bbox-fill";
        const lineId = "staticmap-bbox-line";
        const sourceId = "staticmap-bbox-source";
        const pLayerId = "staticmap-bbox-points";
        const pSourceId = "staticmap-bbox-points-source";

        // Clean up previous layers
        try { map.removeLayer(fillId); } catch (e) { }
        try { map.removeLayer(lineId); } catch (e) { }
        try { map.removeLayer(pLayerId); } catch (e) { }
        try { map.removeSource(sourceId); } catch (e) { }
        try { map.removeSource(pSourceId); } catch (e) { }

        if (bboxPoints.length === 0) return;

        // Draw points picked so far
        map.addSource(pSourceId, {
            type: "geojson",
            data: {
                type: "FeatureCollection",
                features: bboxPoints.map(p => ({
                    type: "Feature",
                    geometry: { type: "Point", coordinates: [p.lng, p.lat] }
                }))
            }
        });
        map.addLayer({
            id: pLayerId, type: "circle", source: pSourceId,
            paint: { "circle-radius": 6, "circle-color": "#eab308", "circle-stroke-width": 2, "circle-stroke-color": "#fff" }
        });

        // If 2 points are picked, draw the rectangle
        if (bboxPoints.length === 2) {
            const p1 = bboxPoints[0];
            const p2 = bboxPoints[1];
            // Sort to ensure min/max
            const minX = Math.min(p1.lng, p2.lng);
            const maxX = Math.max(p1.lng, p2.lng);
            const minY = Math.min(p1.lat, p2.lat);
            const maxY = Math.max(p1.lat, p2.lat);

            const coords = [
                [minX, minY],
                [maxX, minY],
                [maxX, maxY],
                [minX, maxY],
                [minX, minY]
            ];

            map.addSource(sourceId, {
                type: "geojson",
                data: { type: "Feature", geometry: { type: "Polygon", coordinates: [coords] } }
            });
            map.addLayer({ id: fillId, type: "fill", source: sourceId, paint: { "fill-color": "#eab308", "fill-opacity": 0.15 } });
            map.addLayer({ id: lineId, type: "line", source: sourceId, paint: { "line-color": "#eab308", "line-width": 2, "line-dasharray": [3, 2] } });

            // Calculate exact aspect ratio of the drawn box to prevent padding
            const px1 = map.project([minX, minY]);
            const px2 = map.project([maxX, maxY]);
            const pxWidth = Math.abs(px2.x - px1.x);
            const pxHeight = Math.abs(px2.y - px1.y);
            if (pxWidth > 0 && pxHeight > 0) {
                const ratio = pxHeight / pxWidth;
                setBoxRatio(ratio);
                // Auto adjust height to match width based on drawn ratio
                if (autoRatio) {
                    setHeight(Math.round(parseInt(width || 800) * ratio).toString());
                }
            }
        } else {
            setBoxRatio(null);
        }

        return () => {
            try { map.removeLayer(fillId); } catch (e) { }
            try { map.removeLayer(lineId); } catch (e) { }
            try { map.removeLayer(pLayerId); } catch (e) { }
            try { map.removeSource(sourceId); } catch (e) { }
            try { map.removeSource(pSourceId); } catch (e) { }
        };
    }, [map, bboxPoints, tab]);


    const handleGenerate = async () => {
        if (!map) return;
        setLoading(true); setError(""); setImageUrl(null);
        try {
            let res;
            if (tab === "center") {
                const center = map.getCenter();
                const options = {};
                if (markerCoords.trim()) options.marker = `${markerCoords}|red`;
                res = await client.tiles.getStaticMapByCenter(
                    style, center.lng, center.lat, parseInt(zoom), parseInt(width), parseInt(height), format, options
                );
            } else {
                if (bboxPoints.length !== 2) {
                    setError("Please pick 2 points on the map to define the bounding box (South-West and North-East corners).");
                    setLoading(false);
                    return;
                }
                const p1 = bboxPoints[0];
                const p2 = bboxPoints[1];
                const bbox = {
                    minx: Math.min(p1.lng, p2.lng),
                    miny: Math.min(p1.lat, p2.lat),
                    maxx: Math.max(p1.lng, p2.lng),
                    maxy: Math.max(p1.lat, p2.lat),
                };
                res = await client.tiles.getStaticMapByBBox(style, bbox, parseInt(width), parseInt(height), format);
            }

            // SDK returns arraybuffer — convert to blob URL
            if (res instanceof ArrayBuffer || (res && res.byteLength !== undefined)) {
                const mimeType = format === "png" ? "image/png" : "image/jpeg";
                const blob = new Blob([res], { type: mimeType });
                setImageUrl(URL.createObjectURL(blob));
            } else if (res instanceof Blob) {
                setImageUrl(URL.createObjectURL(res));
            } else if (typeof res === "string" && (res.startsWith("http") || res.startsWith("data:"))) {
                setImageUrl(res);
            } else {
                // If it's a JSON response with a URL
                const url = res?.url || res?.image_url || res?.imageUrl;
                if (url) {
                    setImageUrl(url);
                } else {
                    setError("Unexpected response format. Check console.");
                    console.log("Static map response:", res);
                }
            }
        } catch (e) {
            setError(e.message || "Failed to generate static map");
        }
        setLoading(false);
    };

    return (
        <div>
            <h2 className="text-base font-semibold text-gray-800 mb-4">Static Map</h2>
            <p className="text-xs text-gray-400 mb-3">Generate a static map image</p>

            {/* Tabs */}
            <div className="flex bg-gray-100/60 backdrop-blur-sm rounded-lg p-0.5 mb-4">
                <button className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${tab === "center" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"}`}
                    onClick={() => { setTab("center"); setError(""); }}>By Center</button>
                <button className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${tab === "bbox" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"}`}
                    onClick={() => { setTab("bbox"); setError(""); }}>By Bounds</button>
            </div>

            {/* Bounding Box Picker */}
            {tab === "bbox" && (
                <div className="mb-4 bg-yellow-50/50 border border-yellow-100 rounded-lg p-3">
                    <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">Define Boundary</label>
                    <div className="flex gap-2">
                        <button onClick={() => setPickMode(true)}
                            className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all ${pickMode ? "bg-yellow-500 text-white" : "bg-white border border-yellow-200 text-yellow-600 hover:bg-yellow-50"}`}>
                            <MdTouchApp size={14} /> {bboxPoints.length === 0 ? "Pick 2 Points" : bboxPoints.length === 1 ? "Pick 2nd Point..." : "Redraw Box"}
                        </button>
                        {bboxPoints.length > 0 && (
                            <button onClick={() => { setBboxPoints([]); setPickMode(false); if (map) map.getCanvas().style.cursor = ""; }}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-all">
                                <MdDelete size={14} /> Clear
                            </button>
                        )}
                    </div>
                    {bboxPoints.length === 2 && (
                        <div className="mt-3 text-[10px] text-gray-600">
                            <div className="font-mono bg-white/50 p-2 rounded border border-yellow-200">
                                SW: {Math.min(bboxPoints[0].lng, bboxPoints[1].lng).toFixed(4)}, {Math.min(bboxPoints[0].lat, bboxPoints[1].lat).toFixed(4)}<br />
                                NE: {Math.max(bboxPoints[0].lng, bboxPoints[1].lng).toFixed(4)}, {Math.max(bboxPoints[0].lat, bboxPoints[1].lat).toFixed(4)}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Options */}
            <div className="space-y-3 mb-4">
                <div>
                    <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Style</label>
                    <select className="w-full px-3 py-2 bg-white/50 rounded-lg text-xs border border-white/30 focus:border-blue-400 outline-none" value={style} onChange={(e) => setStyle(e.target.value)}>
                        {["default-light-standard", "default-dark-standard", "eclipse-light-standard", "bolt-light", "vintage-light", "positron"].map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
                <div className="flex gap-2">
                    <div className="flex-1">
                        <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Width</label>
                        <input className="w-full px-3 py-2 bg-white/50 rounded-lg text-xs border border-white/30 outline-none" type="number" value={width} onChange={(e) => {
                            const newW = e.target.value;
                            setWidth(newW);
                            if (tab === "bbox" && boxRatio && autoRatio) setHeight(Math.round(parseInt(newW || 0) * boxRatio).toString());
                        }} />
                    </div>
                    <div className="flex-1">
                        <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Height {tab === "bbox" && boxRatio && <span className="text-blue-500 lowercase">(Auto)</span>}</label>
                        <input className={`w-full px-3 py-2 rounded-lg text-xs border outline-none ${tab === "bbox" && autoRatio && boxRatio ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white/50 border-white/30'}`} type="number"
                            value={height}
                            onChange={(e) => {
                                setHeight(e.target.value);
                                if (tab === "bbox") setAutoRatio(false); // Disable auto if user manually edits height
                            }} />
                    </div>
                </div>
                {tab === "center" && (
                    <div>
                        <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Zoom</label>
                        <input className="w-full px-3 py-2 bg-white/50 rounded-lg text-xs border border-white/30 outline-none" type="number" min="1" max="20" value={zoom} onChange={(e) => setZoom(e.target.value)} />
                    </div>
                )}
                <div className="flex gap-2">
                    {["png", "jpg"].map((f) => (
                        <button key={f} onClick={() => setFormat(f)}
                            className={`flex-1 py-2 text-xs font-medium rounded-lg uppercase transition-all ${format === f ? "bg-blue-50 text-blue-600 border border-blue-200" : "bg-white/50 text-gray-500 border border-gray-200"}`}>
                            {f}
                        </button>
                    ))}
                </div>
                {tab === "center" && (
                    <div>
                        <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Marker (optional, lng,lat)</label>
                        <input className="w-full px-3 py-2 bg-white/50 rounded-lg text-xs border border-white/30 outline-none font-mono" placeholder="77.61,12.93"
                            value={markerCoords} onChange={(e) => setMarkerCoords(e.target.value)} />
                    </div>
                )}
            </div>

            <button
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${loading ? "bg-gray-200/50 text-gray-400" : "bg-blue-500 hover:bg-blue-600 text-white shadow-sm shadow-blue-200"
                    }`}
                onClick={handleGenerate} disabled={loading}
            >
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><MdImage size={16} /> Generate Map Image</>}
            </button>

            {error && <div className="mt-3 text-red-500 text-xs bg-red-50 rounded-lg px-3 py-2 border border-red-100">{error}</div>}

            {imageUrl && (
                <div className="mt-4 animate-fade-in">
                    <div className="rounded-xl overflow-hidden border border-white/20 shadow-sm relative group bg-gray-100">
                        <img src={imageUrl} alt="Static Map" className="w-full h-auto object-contain max-h-[400px]" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                            <a href={imageUrl} download={`static-map.${format}`}
                                className="flex items-center gap-2 px-4 py-2 bg-white text-gray-800 rounded-lg text-sm font-bold hover:scale-105 shadow-xl transition-all">
                                <MdDownload size={18} /> Download
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaticMapPanel;
