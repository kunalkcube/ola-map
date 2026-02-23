import React, { useState } from "react";
import { MdPlace, MdAdd, MdClose, MdGridView } from "react-icons/md";

// Helpers
const formatDistance = (meters) => {
    if (meters === undefined || meters === null) return "—";
    if (meters < 1000) return `${meters} m`;
    return `${(meters / 1000).toFixed(1)} km`;
};

const formatDuration = (seconds) => {
    if (seconds === undefined || seconds === null) return "—";
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) return `${hrs}h ${mins % 60}m`;
    return `${mins} min`;
};

const DistanceMatrixPanel = ({ client }) => {
    const [origins, setOrigins] = useState([""]);
    const [destinations, setDestinations] = useState([""]);
    const [mode, setMode] = useState("driving");
    const [useTraffic, setUseTraffic] = useState(true);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const updateOrigin = (i, val) => { const o = [...origins]; o[i] = val; setOrigins(o); };
    const updateDest = (i, val) => { const d = [...destinations]; d[i] = val; setDestinations(d); };
    const addOrigin = () => setOrigins([...origins, ""]);
    const addDest = () => setDestinations([...destinations, ""]);
    const removeOrigin = (i) => setOrigins(origins.filter((_, j) => j !== i));
    const removeDest = (i) => setDestinations(destinations.filter((_, j) => j !== i));

    const fetchMatrix = async () => {
        const validOrigins = origins.filter(o => o.trim());
        const validDests = destinations.filter(d => d.trim());
        if (validOrigins.length === 0 || validDests.length === 0) {
            setError("Add at least one origin and destination");
            return;
        }
        setLoading(true); setError(""); setResult(null);
        try {
            const originsStr = validOrigins.join("|");
            const destsStr = validDests.join("|");
            const res = useTraffic
                ? await client.routing.getDistanceMatrix(originsStr, destsStr, { mode })
                : await client.routing.getDistanceMatrixBasic(originsStr, destsStr);
            setResult(res);
        } catch (e) { setError(e.message || "Failed"); }
        setLoading(false);
    };

    const renderInput = (list, updateFn, removeFn, addFn, label) => (
        <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{label}</label>
                <button onClick={addFn} className="text-blue-500 hover:text-blue-600 transition-colors">
                    <MdAdd size={18} />
                </button>
            </div>
            {list.map((val, i) => (
                <div key={i} className="flex gap-1.5 mb-1.5">
                    <input
                        className="flex-1 px-3 py-2 bg-white/50 backdrop-blur-sm rounded-lg text-xs text-gray-800 placeholder-gray-400 border border-white/30 focus:border-blue-400 outline-none transition-all font-mono"
                        placeholder="lat,lng"
                        value={val}
                        onChange={(e) => updateFn(i, e.target.value)}
                    />
                    {list.length > 1 && (
                        <button onClick={() => removeFn(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                            <MdClose size={16} />
                        </button>
                    )}
                </div>
            ))}
        </div>
    );

    return (
        <div>
            <h2 className="text-base font-semibold text-gray-800 mb-4">Distance Matrix</h2>

            {renderInput(origins, updateOrigin, removeOrigin, addOrigin, "Origins")}
            {renderInput(destinations, updateDest, removeDest, addDest, "Destinations")}

            {/* Options */}
            <div className="flex gap-2 mb-3">
                {["driving", "walking"].map((m) => (
                    <button key={m} onClick={() => setMode(m)}
                        className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all capitalize ${mode === m ? "bg-blue-50 text-blue-600 border border-blue-200" : "bg-white/50 text-gray-500 border border-gray-200"
                            }`}
                    >{m}</button>
                ))}
            </div>

            <label className="flex items-center gap-2 text-xs text-gray-600 mb-4 cursor-pointer">
                <input type="checkbox" checked={useTraffic} onChange={() => setUseTraffic(!useTraffic)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-400" />
                Include traffic data
            </label>

            <button
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${loading ? "bg-gray-200/50 text-gray-400" : "bg-blue-500 hover:bg-blue-600 text-white shadow-sm shadow-blue-200"
                    }`}
                onClick={fetchMatrix}
                disabled={loading}
            >
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><MdGridView size={16} /> Calculate Matrix</>}
            </button>

            {error && <div className="mt-3 text-red-500 text-xs bg-red-50 rounded-lg px-3 py-2">{error}</div>}

            {/* Results */}
            {result && (
                <div className="mt-4 animate-fade-in">
                    {result.rows ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse">
                                <thead>
                                    <tr>
                                        <th className="p-2 bg-gray-100/60 rounded-tl-lg text-gray-500 font-medium text-left">O→D</th>
                                        {destinations.filter(d => d.trim()).map((d, i) => (
                                            <th key={i} className="p-2 bg-gray-100/60 text-gray-500 font-medium text-center last:rounded-tr-lg">D{i + 1}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.rows.map((row, ri) => (
                                        <tr key={ri}>
                                            <td className="p-2 bg-gray-50/40 font-medium text-gray-600 last:rounded-bl-lg">O{ri + 1}</td>
                                            {(row.elements || []).map((el, ci) => (
                                                <td key={ci} className={`p-2 text-center border-t border-gray-100/40 last:rounded-br-lg ${el.status !== "OK" ? "bg-red-50/50" : ""}`}>
                                                    {el.status === "OK" ? (
                                                        <>
                                                            <div className="font-medium text-gray-700">{formatDistance(el.distance)}</div>
                                                            <div className="text-gray-400 text-[10px]">{formatDuration(el.duration)}</div>
                                                        </>
                                                    ) : (
                                                        <div className="text-[10px] text-red-400">{el.status || "Failed"}</div>
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="bg-white/50 backdrop-blur-xl rounded-xl p-3 border border-white/20">
                            <pre className="text-[10px] text-gray-600 overflow-auto whitespace-pre-wrap break-all font-mono max-h-60">
                                {JSON.stringify(result, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DistanceMatrixPanel;
