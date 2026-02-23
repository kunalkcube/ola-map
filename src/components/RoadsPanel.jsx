import React, { useState } from "react";
import { MdTimeline, MdEditRoad, MdSpeed, MdMyLocation, MdPlace } from "react-icons/md";

const RoadsPanel = ({ client, map }) => {
    const [tab, setTab] = useState("snap");
    const [coords, setCoords] = useState("");
    const [mode, setMode] = useState("DRIVING");
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const useMapCenter = () => {
        if (map) {
            const c = map.getCenter();
            const existing = coords.trim();
            const point = `${c.lat.toFixed(6)},${c.lng.toFixed(6)}`;
            setCoords(existing ? `${existing}|${point}` : point);
        }
    };

    const handleSnap = async () => {
        if (!coords.trim()) return;
        setLoading(true); setError(""); setResults(null);
        try {
            const res = await client.roads.snapToRoad(coords.trim(), true);
            setResults({ type: "snap", data: res });
        } catch (e) {
            const msg = e.message || "Failed";
            if (msg.includes("404")) setError("Roads API endpoint not found — this API may not be available for your plan.");
            else if (msg.includes("401") || msg.includes("403")) setError("Unauthorized — Roads API may require specific account access.");
            else setError(msg);
        }
        setLoading(false);
    };

    const handleNearest = async () => {
        if (!coords.trim()) return;
        setLoading(true); setError(""); setResults(null);
        try {
            const res = await client.roads.nearestRoads(coords.trim(), mode, 500);
            setResults({ type: "nearest", data: res });
        } catch (e) {
            const msg = e.message || "Failed";
            if (msg.includes("404")) setError("Roads API endpoint not found — this API may not be available for your plan.");
            else if (msg.includes("401") || msg.includes("403")) setError("Unauthorized — Roads API may require specific account access.");
            else setError(msg);
        }
        setLoading(false);
    };

    const handleSpeed = async () => {
        if (!coords.trim()) return;
        setLoading(true); setError(""); setResults(null);
        try {
            const res = await client.roads.speedLimits(coords.trim());
            setResults({ type: "speed", data: res });
        } catch (e) {
            const msg = e.message || "Failed";
            if (msg.includes("404")) setError("Roads API endpoint not found — this API may not be available for your plan.");
            else if (msg.includes("401") || msg.includes("403")) setError("Unauthorized — Roads API may require specific account access.");
            else setError(msg);
        }
        setLoading(false);
    };

    const handleAction = () => {
        if (tab === "snap") handleSnap();
        else if (tab === "nearest") handleNearest();
        else handleSpeed();
    };

    const tabs = [
        { id: "snap", label: "Snap to Road", icon: MdTimeline },
        { id: "nearest", label: "Nearest", icon: MdEditRoad },
        { id: "speed", label: "Speed Limits", icon: MdSpeed },
    ];

    return (
        <div>
            <h2 className="text-base font-semibold text-gray-800 mb-4">Roads</h2>

            {/* Tab switcher */}
            <div className="flex bg-gray-100/60 backdrop-blur-sm rounded-lg p-0.5 mb-4">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        className={`flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-medium rounded-md transition-all ${tab === t.id ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            }`}
                        onClick={() => { setTab(t.id); setResults(null); setError(""); }}
                    >
                        <t.icon size={14} /> {t.label}
                    </button>
                ))}
            </div>

            {/* Coords input */}
            <div className="mb-3">
                <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">
                    Coordinates (lat,lng|lat,lng)
                </label>
                <textarea
                    className="w-full px-3 py-2.5 bg-white/50 backdrop-blur-sm rounded-lg text-xs text-gray-800 placeholder-gray-400 border border-white/30 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none font-mono"
                    rows={3}
                    placeholder="12.999,77.673|12.992,77.658"
                    value={coords}
                    onChange={(e) => setCoords(e.target.value)}
                />
            </div>

            {/* Mode selector for nearest */}
            {tab === "nearest" && (
                <div className="flex gap-2 mb-3">
                    {["DRIVING", "WALKING"].map((m) => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${mode === m ? "bg-blue-50 text-blue-600 border border-blue-200" : "bg-white/50 text-gray-500 border border-gray-200"
                                }`}
                        >
                            {m}
                        </button>
                    ))}
                </div>
            )}

            <div className="flex gap-2 mb-4">
                <button
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${loading ? "bg-gray-200/50 text-gray-400" : "bg-blue-500 hover:bg-blue-600 text-white shadow-sm shadow-blue-200"
                        }`}
                    onClick={handleAction}
                    disabled={loading}
                >
                    {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Fetch"}
                </button>
                <button onClick={useMapCenter}
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/50 border border-white/30 text-gray-500 hover:text-gray-700 transition-all shrink-0"
                    title="Add map center">
                    <MdMyLocation size={18} />
                </button>
            </div>

            {error && <div className="text-red-500 text-xs mb-3 bg-red-50 rounded-lg px-3 py-2">{error}</div>}

            {/* Results */}
            {results && (
                <div className="animate-fade-in bg-white/50 backdrop-blur-xl rounded-xl p-3 border border-white/20">
                    <div className="text-xs font-bold text-gray-600 mb-2">
                        {results.type === "snap" ? "Snapped Points" : results.type === "nearest" ? "Nearest Roads" : "Speed Limits"}
                    </div>
                    <pre className="text-[10px] text-gray-600 overflow-x-auto whitespace-pre-wrap break-all font-mono max-h-60 overflow-y-auto">
                        {JSON.stringify(results.data, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
};

export default RoadsPanel;
