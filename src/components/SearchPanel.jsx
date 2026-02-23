import React, { useState, useCallback, useRef } from "react";
import { MdSearch, MdPlace, MdStar, MdDirections, MdClose, MdCheckCircle, MdPhoto, MdAccessTime, MdPhone, MdLanguage } from "react-icons/md";

const SearchPanel = ({ client, map, onPlaceSelect, onDirectionsTo }) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [selectedPlace, setSelectedPlace] = useState(null);
    const [placeDetails, setPlaceDetails] = useState(null);
    const [photoUrl, setPhotoUrl] = useState(null);
    const [validation, setValidation] = useState(null);
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef(null);

    const handleSearch = useCallback((q) => {
        setQuery(q);
        setSelectedPlace(null);
        setPlaceDetails(null);
        setPhotoUrl(null);
        setValidation(null);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!q.trim()) { setResults([]); return; }

        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await client.places.autocomplete(q);
                setResults(res.predictions || []);
            } catch (e) { console.error("Autocomplete error:", e); }
            setLoading(false);
        }, 300);
    }, [client]);

    const handleSelect = async (place) => {
        setResults([]);
        setQuery(place.description);
        setSelectedPlace(place);
        setPhotoUrl(null);
        setValidation(null);
        const { lat, lng } = place.geometry.location;
        onPlaceSelect({ lat, lng, name: place.description });

        if (place.place_id) {
            try {
                // Use advanced details for richer info (hours, reviews, photos)
                const details = await client.places.placeDetailsAdvanced(place.place_id);
                const result = details.result || details;
                setPlaceDetails(result);

                // Fetch place photo if available
                if (result.photos?.[0]?.photo_reference) {
                    try {
                        const photo = await client.places.photo(result.photos[0].photo_reference);
                        if (photo instanceof Blob) {
                            setPhotoUrl(URL.createObjectURL(photo));
                        } else if (photo instanceof ArrayBuffer || photo?.byteLength !== undefined) {
                            const blob = new Blob([photo], { type: "image/jpeg" });
                            setPhotoUrl(URL.createObjectURL(blob));
                        } else if (typeof photo === "string" && (photo.startsWith("http") || photo.startsWith("data:"))) {
                            setPhotoUrl(photo);
                        } else if (photo?.url || photo?.image_url || photo?.photo_url) {
                            setPhotoUrl(photo.url || photo.image_url || photo.photo_url);
                        }
                    } catch (e) { /* Photo API may not be available */ }
                }
            } catch (e) {
                // Fallback to basic details
                try {
                    const details = await client.places.placeDetails(place.place_id);
                    if (details.result) setPlaceDetails(details.result);
                } catch (e2) { console.error("Place details error:", e2); }
            }
        }
    };

    const validateAddress = async () => {
        if (!selectedPlace) return;
        const addr = placeDetails?.formatted_address || selectedPlace.description;
        try {
            const res = await client.places.addressValidation(addr);
            setValidation(res);
        } catch (e) { console.error("Validation error:", e); setValidation({ error: "Validation failed" }); }
    };

    const clearSearch = () => {
        setQuery("");
        setResults([]);
        setSelectedPlace(null);
        setPlaceDetails(null);
        setPhotoUrl(null);
        setValidation(null);
    };

    return (
        <div>
            {/* Search Input */}
            <div className="relative">
                <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    className="w-full pl-10 pr-10 py-3 bg-white/50 backdrop-blur-sm rounded-xl text-sm text-gray-800 placeholder-gray-400 border border-white/30 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white/80 outline-none transition-all"
                    placeholder="Search places…"
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                />
                {query && (
                    <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <MdClose size={18} />
                    </button>
                )}
            </div>

            {/* Loading */}
            {loading && (
                <div className="mt-2 h-0.5 bg-gray-100 rounded overflow-hidden">
                    <div className="h-full w-1/3 bg-blue-500 rounded animate-pulse" />
                </div>
            )}

            {/* Autocomplete results */}
            {results.length > 0 && (
                <div className="mt-3 space-y-0.5">
                    {results.map((place, i) => (
                        <button
                            key={i}
                            className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-white/40 transition-colors text-left group"
                            onClick={() => handleSelect(place)}
                        >
                            <MdPlace className="text-gray-400 group-hover:text-blue-500 mt-0.5 shrink-0 transition-colors" size={18} />
                            <div className="min-w-0">
                                <div className="text-sm font-medium text-gray-800 truncate">
                                    {place.structured_formatting?.main_text || place.description}
                                </div>
                                <div className="text-xs text-gray-400 truncate">
                                    {place.structured_formatting?.secondary_text || ""}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Selected place details — info card */}
            {selectedPlace && (
                <div className="mt-4 animate-fade-in">
                    {/* Place photo */}
                    {photoUrl && (
                        <div className="rounded-xl overflow-hidden mb-3 shadow-sm">
                            <img src={photoUrl} alt="Place" className="w-full h-36 object-cover" />
                        </div>
                    )}

                    <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl border border-blue-100 p-4">
                        <h3 className="text-base font-semibold text-gray-800 mb-1">
                            {placeDetails?.name || selectedPlace.structured_formatting?.main_text || selectedPlace.description}
                        </h3>
                        <p className="text-xs text-gray-500 mb-3">
                            {placeDetails?.formatted_address || selectedPlace.structured_formatting?.secondary_text || ""}
                        </p>

                        {/* Rating */}
                        {placeDetails?.rating && (
                            <div className="flex items-center gap-1.5 mb-3">
                                <span className="text-sm font-semibold text-gray-800">{placeDetails.rating}</span>
                                <div className="flex gap-0.5">
                                    {[...Array(5)].map((_, i) => (
                                        <MdStar key={i} size={14} className={i < Math.round(placeDetails.rating) ? "text-yellow-400" : "text-gray-200"} />
                                    ))}
                                </div>
                                {placeDetails.user_ratings_total && (
                                    <span className="text-[10px] text-gray-400">({placeDetails.user_ratings_total})</span>
                                )}
                            </div>
                        )}

                        {/* Opening hours */}
                        {placeDetails?.opening_hours && (
                            <div className="flex items-center gap-1.5 text-xs mb-3">
                                <MdAccessTime size={14} className="text-gray-400" />
                                <span className={placeDetails.opening_hours.open_now ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                                    {placeDetails.opening_hours.open_now ? "Open now" : "Closed"}
                                </span>
                            </div>
                        )}

                        {/* Phone */}
                        {placeDetails?.formatted_phone_number && (
                            <div className="flex items-center gap-1.5 text-xs mb-3 text-gray-600">
                                <MdPhone size={14} className="text-gray-400" />
                                {placeDetails.formatted_phone_number}
                            </div>
                        )}

                        {/* Website */}
                        {placeDetails?.website && (
                            <div className="flex items-center gap-1.5 text-xs mb-3">
                                <MdLanguage size={14} className="text-gray-400" />
                                <a href={placeDetails.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate">
                                    {placeDetails.website.replace(/^https?:\/\//, "").slice(0, 40)}
                                </a>
                            </div>
                        )}

                        {/* Type tags */}
                        {placeDetails?.types && (
                            <div className="flex flex-wrap gap-1.5 mb-4">
                                {placeDetails.types.slice(0, 3).map((t, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-white rounded-full text-[10px] font-medium text-gray-500 border border-gray-200">
                                        {t.replace(/_/g, " ")}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    const { lat, lng } = selectedPlace.geometry.location;
                                    onDirectionsTo({ lat, lng, name: selectedPlace.description });
                                }}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-all shadow-sm shadow-blue-200"
                            >
                                <MdDirections size={18} /> Directions
                            </button>
                            <button
                                onClick={validateAddress}
                                className="flex items-center justify-center gap-1 px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-all"
                                title="Validate address"
                            >
                                <MdCheckCircle size={16} /> Validate
                            </button>
                        </div>

                        {/* Validation result */}
                        {validation && (
                            <div className="mt-3 bg-white/80 rounded-lg p-2.5 border border-gray-100">
                                <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Address Validation</div>
                                <pre className="text-[10px] text-gray-600 overflow-auto whitespace-pre-wrap break-all font-mono max-h-40">
                                    {JSON.stringify(validation, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchPanel;
