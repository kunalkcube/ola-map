import React, { useState, useCallback, useRef } from "react";
import { MdPlace, MdAdd, MdClose, MdRoute, MdSwapVert, MdLoop } from "react-icons/md";

const RouteOptimizerPanel = ({ client, map, onRouteResult }) => {
    const [stops, setStops] = useState(["", "", ""]);
    const [stopNames, setStopNames] = useState(["", "", ""]);
    const [results, setResults] = useState([]);
    const [mode, setMode] = useState("driving");
    const [roundTrip, setRoundTrip] = useState(false);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const debounceRef = useRef({});

    const updateStop = (i, val) => {
        const s = [...stops]; s[i] = val; setStops(s);
        const n = [...stopNames]; n[i] = val; setStopNames(n);

        // Autocomplete
        if (debounceRef.current[i]) clearTimeout(debounceRef.current[i]);
        if (!val.trim()) { setResults([]); return; }
        debounceRef.current[i] = setTimeout(async () => {
            try {
                const res = await client.places.autocomplete(val);
                setResults(res.predictions || []);
                setResults(prev => ({ idx: i, items: res.predictions || [] }));
            } catch (e) { }
        }, 300);
    };

    const selectPlace = (place, i) => {
        const { lat, lng } = place.geometry.location;
        const s = [...stops]; s[i] = `${lat},${lng}`; setStops(s);
        const n = [...stopNames]; n[i] = place.description; setStopNames(n);
        setResults([]);
    };

    const addStop = () => { setStops([...stops, ""]); setStopNames([...stopNames, ""]); };
    const removeStop = (i) => {
        if (stops.length <= 2) return;
        setStops(stops.filter((_, j) => j !== i));
        setStopNames(stopNames.filter((_, j) => j !== i));
    };

    const optimize = async () => {
        const validStops = stops.filter(s => s.trim() && s.includes(","));
        if (validStops.length < 2) { setError("Add at least 2 valid stops (lat,lng)"); return; }
        setLoading(true); setError(""); setResult(null);
        try {
            const locations = validStops.join("|");
            const res = await client.routing.routeOptimizer(locations, {
                source: "first",
                destination: "last",
                round_trip: roundTrip,
                mode,
                steps: true,
                overview: "full",
            });
            setResult(res);
            if (res.routes?.[0] && onRouteResult) {
                onRouteResult(res.routes[0], { lat: parseFloat(validStops[0].split(",")[0]), lng: parseFloat(validStops[0].split(",")[1]) },
                    { lat: parseFloat(validStops[validStops.length - 1].split(",")[0]), lng: parseFloat(validStops[validStops.length - 1].split(",")[1]) });
            }
        } catch (e) { setError(e.message || "Failed"); }
        setLoading(false);
    };

    return (
        <div>
            <h2 className="text-base font-semibold text-gray-800 mb-4">Route Optimizer</h2>
            <p className="text-xs text-gray-400 mb-3">Add multiple stops to find the optimal route order</p>

            {/* Stops */}
            <div className="space-y-2 mb-4">
                {stops.map((stop, i) => (
                    <div key={i} className="flex gap-1.5">
                        <div className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-50 text-blue-500 text-[10px] font-bold shrink-0 mt-1.5">
                            {i + 1}
                        </div>
                        <div className="flex-1 relative">
                            <input
                                className="w-full px-3 py-2 bg-white/50 backdrop-blur-sm rounded-lg text-xs text-gray-800 placeholder-gray-400 border border-white/30 focus:border-blue-400 outline-none transition-all"
                                placeholder={i === 0 ? "Start point" : i === stops.length - 1 ? "End point" : `Stop ${i}`}
                                value={stopNames[i]}
                                onChange={(e) => updateStop(i, e.target.value)}
                            />
                            {/* Autocomplete dropdown */}
                            {results?.idx === i && results?.items?.length > 0 && (
                                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white/90 backdrop-blur-2xl rounded-lg border border-white/20 shadow-lg overflow-hidden">
                                    {results.items.slice(0, 3).map((p, pi) => (
                                        <button key={pi} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/50 text-left text-xs transition-colors"
                                            onClick={() => selectPlace(p, i)}>
                                            <MdPlace className="text-gray-400 shrink-0" size={14} />
                                            <span className="truncate text-gray-700">{p.description}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {stops.length > 2 && (
                            <button onClick={() => removeStop(i)} className="text-gray-400 hover:text-red-500 transition-colors mt-1.5">
                                <MdClose size={16} />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            <button onClick={addStop} className="flex items-center gap-1 text-blue-500 text-xs font-medium mb-4 hover:text-blue-600 transition-colors">
                <MdAdd size={16} /> Add stop
            </button>

            {/* Options */}
            <div className="flex gap-2 mb-3">
                {["driving", "walking"].map((m) => (
                    <button key={m} onClick={() => setMode(m)}
                        className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all capitalize ${mode === m ? "bg-blue-50 text-blue-600 border border-blue-200" : "bg-white/50 text-gray-500 border border-gray-200"
                            }`}>{m}</button>
                ))}
            </div>

            <label className="flex items-center gap-2 text-xs text-gray-600 mb-4 cursor-pointer">
                <input type="checkbox" checked={roundTrip} onChange={() => setRoundTrip(!roundTrip)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-400" />
                <MdLoop size={14} /> Round trip
            </label>

            <button
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${loading ? "bg-gray-200/50 text-gray-400" : "bg-blue-500 hover:bg-blue-600 text-white shadow-sm shadow-blue-200"
                    }`}
                onClick={optimize} disabled={loading}
            >
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><MdRoute size={16} /> Optimize Route</>}
            </button>

            {error && <div className="mt-3 text-red-500 text-xs bg-red-50 rounded-lg px-3 py-2">{error}</div>}

            {result && (
                <div className="mt-4 animate-fade-in bg-white/50 backdrop-blur-xl rounded-xl p-3 border border-white/20">
                    {result.waypoints && (
                        <div className="mb-3">
                            <div className="text-xs font-bold text-gray-600 mb-2">Optimized Order</div>
                            <div className="space-y-1">
                                {result.waypoints.map((wp, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs text-gray-700">
                                        <span className="w-5 h-5 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold">{i + 1}</span>
                                        {wp.name || `Stop ${wp.waypoint_index + 1}`}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {result.routes?.[0]?.legs?.[0] && (
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-3 text-white">
                            <div className="text-lg font-bold">{result.routes[0].legs[0].readable_duration || ""}</div>
                            <div className="text-blue-100 text-xs">{result.routes[0].legs[0].readable_distance || ""}</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default RouteOptimizerPanel;
