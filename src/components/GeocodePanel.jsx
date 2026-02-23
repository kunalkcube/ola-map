import React, { useState, useEffect } from "react";
import { MdSearch, MdMyLocation, MdPlace } from "react-icons/md";

const GeocodePanel = ({ client, map, onPlaceSelect, contextCoords }) => {
    const [tab, setTab] = useState("forward");
    const [address, setAddress] = useState("");
    const [forwardResult, setForwardResult] = useState(null);
    const [forwardLoading, setForwardLoading] = useState(false);
    const [lat, setLat] = useState("");
    const [lng, setLng] = useState("");
    const [reverseResult, setReverseResult] = useState(null);
    const [reverseLoading, setReverseLoading] = useState(false);

    useEffect(() => {
        if (contextCoords) {
            setTab("reverse");
            setLat(contextCoords.lat?.toFixed(6) || "");
            setLng(contextCoords.lng?.toFixed(6) || "");
        }
    }, [contextCoords]);

    const handleForward = async () => {
        if (!address.trim()) return;
        setForwardLoading(true);
        setForwardResult(null);
        try {
            const res = await client.places.geocode(address);
            if (res.geocodingResults && res.geocodingResults.length > 0) {
                const r = res.geocodingResults[0];
                setForwardResult(r);
                if (r.geometry?.location) {
                    onPlaceSelect({ lat: r.geometry.location.lat, lng: r.geometry.location.lng, name: r.formatted_address || address });
                }
            }
        } catch (e) { console.error("Geocode error:", e); }
        setForwardLoading(false);
    };

    const handleReverse = async () => {
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);
        if (isNaN(latNum) || isNaN(lngNum)) return;
        setReverseLoading(true);
        setReverseResult(null);
        try {
            const res = await client.places.reverseGeocode(latNum, lngNum);
            if (res.results && res.results.length > 0) setReverseResult(res.results[0]);
        } catch (e) { console.error("Reverse geocode error:", e); }
        setReverseLoading(false);
    };

    const useMapCenter = () => {
        if (map) {
            const center = map.getCenter();
            setLat(center.lat.toFixed(6));
            setLng(center.lng.toFixed(6));
        }
    };

    return (
        <div>
            <h2 className="text-base font-semibold text-gray-800 mb-4">Geocode</h2>

            {/* Tabs */}
            <div className="flex bg-gray-100/80 backdrop-blur-sm rounded-lg p-0.5 mb-4">
                <button
                    className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${tab === "forward" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        }`}
                    onClick={() => setTab("forward")}
                >
                    Address → Coords
                </button>
                <button
                    className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${tab === "reverse" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        }`}
                    onClick={() => setTab("reverse")}
                >
                    Coords → Address
                </button>
            </div>

            {tab === "forward" && (
                <div>
                    <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Address</label>
                    <input
                        className="w-full px-3 py-2.5 bg-gray-50 rounded-lg text-sm text-gray-800 placeholder-gray-400 border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all mb-3"
                        placeholder="Enter an address…"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleForward()}
                    />
                    <button
                        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${forwardLoading ? "bg-gray-100 text-gray-400" : "bg-blue-500 hover:bg-blue-600 text-white shadow-sm shadow-blue-200"
                            }`}
                        onClick={handleForward}
                        disabled={forwardLoading}
                    >
                        {forwardLoading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <><MdSearch size={16} /> Geocode</>
                        )}
                    </button>

                    {forwardResult && (
                        <div className="mt-4 animate-fade-in bg-blue-50 rounded-xl border border-blue-100 p-4">
                            <div className="flex items-start gap-2 mb-3">
                                <MdPlace className="text-blue-500 shrink-0 mt-0.5" size={18} />
                                <div className="text-sm font-medium text-gray-700">{forwardResult.formatted_address}</div>
                            </div>
                            {forwardResult.geometry?.location && (
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400">Latitude</span>
                                        <span className="font-medium text-gray-700 font-mono">{forwardResult.geometry.location.lat}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400">Longitude</span>
                                        <span className="font-medium text-gray-700 font-mono">{forwardResult.geometry.location.lng}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {tab === "reverse" && (
                <div>
                    <div className="flex gap-2 mb-3">
                        <div className="flex-1">
                            <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Latitude</label>
                            <input
                                className="w-full px-3 py-2.5 bg-gray-50 rounded-lg text-sm text-gray-800 placeholder-gray-400 border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                placeholder="12.93"
                                value={lat}
                                onChange={(e) => setLat(e.target.value)}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Longitude</label>
                            <input
                                className="w-full px-3 py-2.5 bg-gray-50 rounded-lg text-sm text-gray-800 placeholder-gray-400 border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                placeholder="77.61"
                                value={lng}
                                onChange={(e) => setLng(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 mb-4">
                        <button
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${reverseLoading ? "bg-gray-100 text-gray-400" : "bg-blue-500 hover:bg-blue-600 text-white shadow-sm shadow-blue-200"
                                }`}
                            onClick={handleReverse}
                            disabled={reverseLoading}
                        >
                            {reverseLoading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <><MdMyLocation size={16} /> Reverse Geocode</>
                            )}
                        </button>
                        <button
                            onClick={useMapCenter}
                            className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all shrink-0"
                            title="Use map center"
                        >
                            <MdMyLocation size={18} />
                        </button>
                    </div>

                    {reverseResult && (
                        <div className="animate-fade-in bg-blue-50 rounded-xl border border-blue-100 p-4">
                            <div className="flex items-start gap-2 mb-3">
                                <MdPlace className="text-blue-500 shrink-0 mt-0.5" size={18} />
                                <div className="text-sm font-medium text-gray-700">
                                    {reverseResult.formatted_address || reverseResult.name || "Unknown location"}
                                </div>
                            </div>
                            {reverseResult.address_components && (
                                <div className="space-y-1.5">
                                    {reverseResult.address_components.slice(0, 4).map((c, i) => (
                                        <div key={i} className="flex justify-between text-xs">
                                            <span className="text-gray-400 capitalize">{c.types?.[0]?.replace(/_/g, " ") || "Component"}</span>
                                            <span className="font-medium text-gray-700">{c.long_name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default GeocodePanel;
