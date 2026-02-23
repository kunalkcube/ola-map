import React, { useState, useRef } from "react";
import { MdSearch, MdPlace, MdStar, MdClose } from "react-icons/md";

const TextSearchPanel = ({ client, map, onPlaceSelect }) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef(null);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setLoading(true);
        try {
            const res = await client.places.textSearch(query);
            setResults(res.results || res.predictions || []);
        } catch (e) { console.error("Text search error:", e); }
        setLoading(false);
    };

    const handleSelect = (place) => {
        const lat = place.geometry?.location?.lat;
        const lng = place.geometry?.location?.lng;
        if (lat && lng) {
            onPlaceSelect({ lat, lng, name: place.name || place.formatted_address });
        }
    };

    return (
        <div>
            <h2 className="text-base font-semibold text-gray-800 mb-4">Text Search</h2>
            <p className="text-xs text-gray-400 mb-3">Search with natural language like "hospitals near MG Road"</p>

            <div className="relative mb-3">
                <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    className="w-full pl-10 pr-10 py-3 bg-white/50 backdrop-blur-sm rounded-xl text-sm text-gray-800 placeholder-gray-400 border border-white/30 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    placeholder="Cafes in Koramangala..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                {query && (
                    <button onClick={() => { setQuery(""); setResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <MdClose size={18} />
                    </button>
                )}
            </div>

            <button
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${loading || !query.trim()
                        ? "bg-gray-200/50 text-gray-400 cursor-not-allowed"
                        : "bg-blue-500 hover:bg-blue-600 text-white shadow-sm shadow-blue-200"
                    }`}
                onClick={handleSearch}
                disabled={loading || !query.trim()}
            >
                {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    <><MdSearch size={16} /> Search</>
                )}
            </button>

            {results.length > 0 && (
                <div className="mt-4 animate-fade-in">
                    <div className="text-xs font-medium text-gray-400 mb-2">{results.length} results found</div>
                    <div className="space-y-1">
                        {results.map((place, i) => (
                            <button
                                key={i}
                                className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-white/40 transition-colors text-left group"
                                onClick={() => handleSelect(place)}
                            >
                                <MdPlace className="text-gray-400 group-hover:text-blue-500 mt-0.5 shrink-0 transition-colors" size={16} />
                                <div className="min-w-0 flex-1">
                                    <div className="text-sm font-medium text-gray-700 truncate">{place.name || "Unknown"}</div>
                                    <div className="text-xs text-gray-400 truncate">{place.formatted_address || place.vicinity || ""}</div>
                                    {place.rating && (
                                        <div className="flex items-center gap-1 mt-1">
                                            <MdStar size={12} className="text-yellow-400" />
                                            <span className="text-[10px] text-gray-500">{place.rating}</span>
                                        </div>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {!loading && query && results.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">No results found.</div>
            )}
        </div>
    );
};

export default TextSearchPanel;
