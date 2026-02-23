import React, { useState, useEffect } from "react";
import { MdTerrain, MdMyLocation, MdLandscape, MdAdd, MdClose } from "react-icons/md";

const ElevationPanel = ({ client, map, contextCoords }) => {
    const [tab, setTab] = useState("single");
    const [lat, setLat] = useState("");
    const [lng, setLng] = useState("");
    const [elevation, setElevation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Multi-point
    const [multiCoords, setMultiCoords] = useState([""]);
    const [multiResults, setMultiResults] = useState(null);

    useEffect(() => {
        if (contextCoords) {
            setLat(contextCoords.lat?.toFixed(6) || "");
            setLng(contextCoords.lng?.toFixed(6) || "");
        }
    }, [contextCoords]);

    const useMapCenter = () => {
        if (map) {
            const center = map.getCenter();
            if (tab === "single") {
                setLat(center.lat.toFixed(6));
                setLng(center.lng.toFixed(6));
            } else {
                const coord = `${center.lat.toFixed(6)},${center.lng.toFixed(6)}`;
                setMultiCoords([...multiCoords, coord]);
            }
        }
    };

    const fetchElevation = async () => {
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);
        if (isNaN(latNum) || isNaN(lngNum)) { setError("Enter valid coordinates"); return; }
        setError(""); setLoading(true); setElevation(null);
        try {
            const res = await client.elevation.getElevation(latNum, lngNum);
            if (res.results && res.results.length > 0) setElevation(res.results[0].elevation);
            else if (res.elevation !== undefined) setElevation(res.elevation);
            else setError("No elevation data available");
        } catch (e) { setError("Failed to fetch elevation"); }
        setLoading(false);
    };

    const fetchMultiElevation = async () => {
        const valid = multiCoords.filter(c => c.trim());
        if (valid.length === 0) { setError("Add at least one coordinate"); return; }
        setError(""); setLoading(true); setMultiResults(null);
        try {
            const res = await client.elevation.getMultiElevation(valid);
            setMultiResults(res.results || res);
        } catch (e) { setError(e.message || "Failed"); }
        setLoading(false);
    };

    const updateMultiCoord = (i, val) => { const c = [...multiCoords]; c[i] = val; setMultiCoords(c); };
    const addMultiCoord = () => setMultiCoords([...multiCoords, ""]);
    const removeMultiCoord = (i) => setMultiCoords(multiCoords.filter((_, j) => j !== i));

    return (
        <div>
            <h2 className="text-base font-semibold text-gray-800 mb-4">Elevation</h2>

            {/* Tabs */}
            <div className="flex bg-gray-100/60 backdrop-blur-sm rounded-lg p-0.5 mb-4">
                <button className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${tab === "single" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"}`}
                    onClick={() => setTab("single")}>Single Point</button>
                <button className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${tab === "multi" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"}`}
                    onClick={() => setTab("multi")}>Multi-Point</button>
            </div>

            {tab === "single" && (
                <>
                    <div className="flex gap-2 mb-3">
                        <div className="flex-1">
                            <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Latitude</label>
                            <input className="w-full px-3 py-2.5 bg-white/50 backdrop-blur-sm rounded-lg text-sm text-gray-800 placeholder-gray-400 border border-white/30 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                placeholder="12.93126" value={lat} onChange={(e) => setLat(e.target.value)} />
                        </div>
                        <div className="flex-1">
                            <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Longitude</label>
                            <input className="w-full px-3 py-2.5 bg-white/50 backdrop-blur-sm rounded-lg text-sm text-gray-800 placeholder-gray-400 border border-white/30 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                placeholder="77.61638" value={lng} onChange={(e) => setLng(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex gap-2 mb-4">
                        <button className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${loading ? "bg-gray-100 text-gray-400" : "bg-blue-500 hover:bg-blue-600 text-white shadow-sm shadow-blue-200"}`}
                            onClick={fetchElevation} disabled={loading}>
                            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><MdTerrain size={16} /> Get Elevation</>}
                        </button>
                        <button onClick={useMapCenter}
                            className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/50 border border-white/30 text-gray-500 hover:text-gray-700 transition-all" title="Use map center">
                            <MdMyLocation size={18} />
                        </button>
                    </div>
                    {elevation !== null && !error && (
                        <div className="animate-fade-in bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100 p-6 text-center">
                            <MdLandscape className="mx-auto text-green-500 mb-2" size={32} />
                            <div className="text-4xl font-bold text-gray-800 tracking-tight">
                                {Math.round(elevation)}<span className="text-lg font-normal text-gray-500 ml-1">m</span>
                            </div>
                            <div className="text-xs text-gray-400 mt-1">above sea level</div>
                        </div>
                    )}
                </>
            )}

            {tab === "multi" && (
                <>
                    <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Coordinates (lat,lng)</label>
                            <button onClick={addMultiCoord} className="text-blue-500 hover:text-blue-600"><MdAdd size={18} /></button>
                        </div>
                        {multiCoords.map((c, i) => (
                            <div key={i} className="flex gap-1.5 mb-1.5">
                                <input className="flex-1 px-3 py-2 bg-white/50 rounded-lg text-xs font-mono border border-white/30 focus:border-blue-400 outline-none"
                                    placeholder="12.93126,77.61638" value={c} onChange={(e) => updateMultiCoord(i, e.target.value)} />
                                {multiCoords.length > 1 && (
                                    <button onClick={() => removeMultiCoord(i)} className="text-gray-400 hover:text-red-500"><MdClose size={16} /></button>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2 mb-4">
                        <button className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${loading ? "bg-gray-100 text-gray-400" : "bg-blue-500 hover:bg-blue-600 text-white shadow-sm shadow-blue-200"}`}
                            onClick={fetchMultiElevation} disabled={loading}>
                            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><MdTerrain size={16} /> Get All Elevations</>}
                        </button>
                        <button onClick={useMapCenter}
                            className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/50 border border-white/30 text-gray-500 hover:text-gray-700 transition-all shrink-0" title="Add map center">
                            <MdMyLocation size={18} />
                        </button>
                    </div>
                    {multiResults && Array.isArray(multiResults) && (
                        <div className="animate-fade-in space-y-1.5">
                            {multiResults.map((r, i) => (
                                <div key={i} className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg px-4 py-2.5 border border-green-100">
                                    <div className="text-xs text-gray-500 font-mono">{r.location?.lat?.toFixed(4)}, {r.location?.lng?.toFixed(4)}</div>
                                    <div className="text-sm font-bold text-gray-800">{Math.round(r.elevation)} m</div>
                                </div>
                            ))}
                        </div>
                    )}
                    {multiResults && !Array.isArray(multiResults) && (
                        <div className="bg-white/50 rounded-xl p-3 border border-white/20">
                            <pre className="text-[10px] text-gray-600 overflow-auto whitespace-pre-wrap break-all font-mono max-h-60">
                                {JSON.stringify(multiResults, null, 2)}
                            </pre>
                        </div>
                    )}
                </>
            )}

            {error && <div className="text-red-500 text-xs mb-3 bg-red-50 rounded-lg px-3 py-2">{error}</div>}
        </div>
    );
};

export default ElevationPanel;
