import React, { useState } from "react";
import { MdRestaurant, MdLocalCafe, MdLocalHospital, MdLocalGasStation, MdHotel, MdSchool, MdLocalParking, MdLocalAtm, MdPlace } from "react-icons/md";

const placeTypes = [
    { id: "restaurant", label: "Restaurant", icon: MdRestaurant, color: "text-orange-500" },
    { id: "cafe", label: "Cafe", icon: MdLocalCafe, color: "text-amber-600" },
    { id: "hospital", label: "Hospital", icon: MdLocalHospital, color: "text-red-500" },
    { id: "gas_station", label: "Fuel", icon: MdLocalGasStation, color: "text-green-600" },
    { id: "hotel", label: "Hotel", icon: MdHotel, color: "text-purple-500" },
    { id: "school", label: "School", icon: MdSchool, color: "text-blue-500" },
    { id: "parking", label: "Parking", icon: MdLocalParking, color: "text-indigo-500" },
    { id: "atm", label: "ATM", icon: MdLocalAtm, color: "text-teal-600" },
];

const NearbyPanel = ({ client, map, onPlaceSelect }) => {
    const [selectedType, setSelectedType] = useState(null);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [useAdvanced, setUseAdvanced] = useState(false);

    const searchNearby = async (type) => {
        setSelectedType(type);
        setResults([]);
        if (!map) return;

        const center = map.getCenter();
        const location = `${center.lat},${center.lng}`;
        setLoading(true);

        try {
            const res = useAdvanced
                ? await client.places.nearbySearchAdvanced(location, { types: type, radius: 2000 })
                : await client.places.nearbySearch(location, { types: type, radius: 2000 });
            setResults(res.predictions || res.results || []);
        } catch (e) { console.error("Nearby search error:", e); }
        setLoading(false);
    };

    const handleSelect = async (place) => {
        let lat = place.geometry?.location?.lat;
        let lng = place.geometry?.location?.lng;

        if (lat && lng) {
            onPlaceSelect({ lat, lng, name: place.name || place.description });
            return;
        }

        if (!place.place_id) return;

        setLoading(true);
        try {
            const detailsRes = await client.places.placeDetails(place.place_id);
            if (detailsRes.result?.geometry?.location) {
                lat = detailsRes.result.geometry.location.lat;
                lng = detailsRes.result.geometry.location.lng;
                onPlaceSelect({
                    lat, lng,
                    name: detailsRes.result.name || place.name || place.description || "Unknown"
                });
            }
        } catch (e) {
            console.error("Failed to fetch nearby place details:", e);
        }
        setLoading(false);
    };

    const selectedTypeInfo = placeTypes.find((t) => t.id === selectedType);

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-800">Explore Nearby</h2>
                <label className="flex items-center gap-1.5 text-[10px] text-gray-500 cursor-pointer">
                    <input type="checkbox" checked={useAdvanced} onChange={() => setUseAdvanced(!useAdvanced)}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-blue-500 focus:ring-blue-400" />
                    Advanced
                </label>
            </div>

            {/* Category grid */}
            <div className="grid grid-cols-4 gap-2 mb-4">
                {placeTypes.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => searchNearby(t.id)}
                        className={`flex flex-col items-center gap-1 py-3 rounded-xl transition-all backdrop-blur-sm ${selectedType === t.id
                            ? "bg-blue-50/80 border-blue-200 border shadow-sm"
                            : "bg-gray-50/60 border border-gray-100 hover:bg-gray-100/80"
                            }`}
                    >
                        <t.icon size={20} className={selectedType === t.id ? "text-blue-500" : t.color} />
                        <span className={`text-[10px] font-medium ${selectedType === t.id ? "text-blue-600" : "text-gray-500"}`}>
                            {t.label}
                        </span>
                    </button>
                ))}
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex justify-center py-8">
                    <div className="w-5 h-5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
                </div>
            )}

            {/* Results */}
            {results.length > 0 && (
                <div className="animate-fade-in pb-4">
                    <div className="text-xs font-medium text-gray-400 mb-2">
                        {results.length} {selectedTypeInfo?.label || "places"} found nearby
                        {useAdvanced && <span className="text-blue-500 ml-1">(advanced)</span>}
                    </div>
                    <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                        {results.map((place, i) => (
                            <button
                                key={i}
                                disabled={loading}
                                className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-white/60 bg-white/30 border border-white/20 transition-all text-left group disabled:opacity-50"
                                onClick={() => handleSelect(place)}
                            >
                                <MdPlace className="text-gray-400 group-hover:text-blue-500 mt-0.5 shrink-0 transition-colors" size={18} />
                                <div className="min-w-0">
                                    <div className="text-sm font-semibold text-gray-700 truncate group-hover:text-blue-700 transition-colors">
                                        {place.name || place.structured_formatting?.main_text || "Unknown"}
                                    </div>
                                    <div className="text-[11px] text-gray-500 line-clamp-2 mt-0.5 leading-snug">
                                        {[place.vicinity, place.formatted_address, place.description, place.structured_formatting?.secondary_text]
                                            .find(a => a && typeof a === "string" && a.trim() !== "NA" && a.trim() !== "") || "Address not available"}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {!loading && selectedType && results.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                    No {selectedTypeInfo?.label?.toLowerCase() || "places"} found nearby.
                    <br />
                    <span className="text-xs">Try zooming out or panning the map.</span>
                </div>
            )}
        </div>
    );
};

export default NearbyPanel;
