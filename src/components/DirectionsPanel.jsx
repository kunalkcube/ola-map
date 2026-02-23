import React, { useState, useCallback, useRef, useEffect } from "react";
import { MdSwapVert, MdDirectionsCar, MdDirectionsWalk, MdMyLocation, MdPlace, MdTurnRight, MdStraight, MdTurnLeft, MdRoundaboutLeft, MdStart, MdFlag, MdTurnSlightLeft, MdTurnSlightRight, MdUTurnLeft } from "react-icons/md";

// ── Get instruction text from step ──
// Ola Maps API returns: step.instructions (plural), step.maneuver (string like "depart")
function getStepInstruction(step) {
    // The actual field from Ola Maps routing API is "instructions" (plural!)
    if (step.instructions) return step.instructions;
    // Fallback attempts
    if (step.html_instructions) return stripHtml(step.html_instructions);
    if (step.instruction) return step.instruction;
    return "Continue";
}

function stripHtml(html) {
    return html ? html.replace(/<[^>]*>/g, "").trim() : "";
}

function formatDistance(meters) {
    if (!meters) return "";
    return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

function formatDuration(seconds) {
    if (!seconds) return "";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    return hrs > 0 ? `${hrs} hr ${mins} min` : `${mins} min`;
}

// ── Maneuver icon picker ──
// step.maneuver is a string like "depart", "turn-left", "turn-right", "arrive", etc.
function getManeuverIcon(maneuver) {
    if (!maneuver) return MdStraight;
    const m = maneuver.toLowerCase();
    if (m === "depart") return MdStart;
    if (m === "arrive") return MdFlag;
    if (m.includes("roundabout") || m.includes("rotary")) return MdRoundaboutLeft;
    if (m.includes("uturn") || m.includes("u-turn")) return MdUTurnLeft;
    if (m.includes("slight-left") || m.includes("slight left")) return MdTurnSlightLeft;
    if (m.includes("slight-right") || m.includes("slight right")) return MdTurnSlightRight;
    if (m.includes("left")) return MdTurnLeft;
    if (m.includes("right")) return MdTurnRight;
    return MdStraight;
}

const DirectionsPanel = ({ client, map, userLocation, onRouteResult, initialDestination, initialOrigin }) => {
    const [originQuery, setOriginQuery] = useState("");
    const [destQuery, setDestQuery] = useState("");
    const [originResults, setOriginResults] = useState([]);
    const [destResults, setDestResults] = useState([]);
    const [origin, setOrigin] = useState(null);
    const [destination, setDestination] = useState(null);
    const [mode, setMode] = useState("driving");
    const [routeInfo, setRouteInfo] = useState(null);
    const [steps, setSteps] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showSteps, setShowSteps] = useState(false);
    const debounceRef = useRef({});
    const initialFetched = useRef(false);

    // Pre-fill destination
    useEffect(() => {
        if (initialDestination) {
            setDestQuery(initialDestination.name || "");
            setDestination({ lat: initialDestination.lat, lng: initialDestination.lng });
            initialFetched.current = false;
            if (!initialOrigin && userLocation) {
                setOrigin({ lat: userLocation.lat, lng: userLocation.lng });
                setOriginQuery("Your location");
            }
        }
    }, [initialDestination]);

    // Pre-fill origin
    useEffect(() => {
        if (initialOrigin) {
            setOriginQuery(initialOrigin.name || "");
            setOrigin({ lat: initialOrigin.lat, lng: initialOrigin.lng });
            initialFetched.current = false;
        }
    }, [initialOrigin]);

    // Auto-fetch
    useEffect(() => {
        if (origin && destination && (initialDestination || initialOrigin) && !initialFetched.current) {
            initialFetched.current = true;
            fetchDirections();
        }
    }, [origin, destination]);

    const autocomplete = useCallback((q, target) => {
        if (debounceRef.current[target]) clearTimeout(debounceRef.current[target]);
        if (!q.trim()) {
            target === "origin" ? setOriginResults([]) : setDestResults([]);
            return;
        }
        debounceRef.current[target] = setTimeout(async () => {
            try {
                const res = await client.places.autocomplete(q);
                target === "origin"
                    ? setOriginResults(res.predictions || [])
                    : setDestResults(res.predictions || []);
            } catch (e) { console.error("Autocomplete error:", e); }
        }, 300);
    }, [client]);

    const selectPlace = (place, target) => {
        const { lat, lng } = place.geometry.location;
        if (target === "origin") {
            setOrigin({ lat, lng });
            setOriginQuery(place.description);
            setOriginResults([]);
        } else {
            setDestination({ lat, lng });
            setDestQuery(place.description);
            setDestResults([]);
        }
    };

    const useMyLocation = () => {
        if (userLocation) {
            setOrigin({ lat: userLocation.lat, lng: userLocation.lng });
            setOriginQuery("Your location");
            setOriginResults([]);
        }
    };

    const swapLocations = () => {
        const tmpO = origin, tmpQ = originQuery;
        setOrigin(destination); setOriginQuery(destQuery);
        setDestination(tmpO); setDestQuery(tmpQ);
    };

    const fetchDirections = async () => {
        if (!origin || !destination) return;
        setLoading(true);
        try {
            const result = await client.routing.getDirections(
                { lat: origin.lat, lon: origin.lng },
                { lat: destination.lat, lon: destination.lng },
                { mode, steps: true, overview: "full", language: "en", traffic_metadata: false }
            );
            if (result.routes && result.routes.length > 0) {
                const route = result.routes[0];
                const leg = route.legs[0];
                setRouteInfo({
                    distance: leg.readable_distance || formatDistance(leg.distance),
                    duration: leg.readable_duration || formatDuration(leg.duration),
                });

                // Parse steps — Ola Maps API uses: step.instructions (plural), step.maneuver (string)
                const parsedSteps = (leg.steps || []).map((step) => {
                    const instruction = getStepInstruction(step);
                    const dist = step.readable_distance || (typeof step.distance === "number" ? formatDistance(step.distance) : "");
                    const dur = step.readable_duration || (typeof step.duration === "number" ? formatDuration(step.duration) : "");

                    return {
                        instruction,
                        distance: dist,
                        duration: dur,
                        maneuver: typeof step.maneuver === "string" ? step.maneuver : "",
                    };
                });

                setSteps(parsedSteps);
                onRouteResult && onRouteResult(route, origin, destination);
            }
        } catch (e) { console.error("Directions error:", e); }
        setLoading(false);
    };

    return (
        <div>
            {/* Mode toggle */}
            <div className="flex gap-2 mb-4">
                {[
                    { id: "driving", icon: MdDirectionsCar, label: "Drive" },
                    { id: "walking", icon: MdDirectionsWalk, label: "Walk" },
                ].map((m) => (
                    <button
                        key={m.id}
                        onClick={() => setMode(m.id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-medium transition-all ${mode === m.id
                            ? "bg-blue-50 text-blue-600 border border-blue-200"
                            : "bg-white/50 text-gray-500 border border-gray-200 hover:bg-white/80"
                            }`}
                    >
                        <m.icon size={16} />
                        {m.label}
                    </button>
                ))}
            </div>

            {/* Origin + Destination */}
            <div className="relative flex gap-2 mb-4">
                <div className="flex flex-col items-center justify-center gap-0 pt-2 pb-2">
                    <div className="w-3 h-3 rounded-full border-2 border-blue-500 bg-white" />
                    <div className="w-0.5 h-8 bg-gray-300" />
                    <div className="w-3 h-3 rounded-sm border-2 border-red-500 bg-white" />
                </div>

                <div className="flex-1 space-y-2">
                    <div className="relative">
                        <input
                            className="w-full px-3 py-2.5 bg-white/50 backdrop-blur-sm rounded-lg text-sm text-gray-800 placeholder-gray-400 border border-white/30 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                            placeholder="Choose starting point"
                            value={originQuery}
                            onChange={(e) => { setOriginQuery(e.target.value); autocomplete(e.target.value, "origin"); }}
                        />
                        {!originQuery && userLocation && (
                            <button onClick={useMyLocation}
                                className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-blue-500 text-[11px] font-medium hover:text-blue-600">
                                <MdMyLocation size={14} /> Your location
                            </button>
                        )}
                    </div>
                    <div>
                        <input
                            className="w-full px-3 py-2.5 bg-white/50 backdrop-blur-sm rounded-lg text-sm text-gray-800 placeholder-gray-400 border border-white/30 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                            placeholder="Choose destination"
                            value={destQuery}
                            onChange={(e) => { setDestQuery(e.target.value); autocomplete(e.target.value, "destination"); }}
                        />
                    </div>
                </div>

                <button onClick={swapLocations}
                    className="self-center w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/50 text-gray-400 hover:text-gray-600 transition-all"
                    title="Swap">
                    <MdSwapVert size={20} />
                </button>
            </div>

            {/* Autocomplete dropdowns */}
            {originResults.length > 0 && (
                <div className="mb-3 bg-white/60 backdrop-blur-2xl rounded-lg border border-white/20 shadow-sm overflow-hidden">
                    {originResults.slice(0, 4).map((p, i) => (
                        <button key={i} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/40 text-left transition-colors" onClick={() => selectPlace(p, "origin")}>
                            <MdPlace className="text-gray-400 shrink-0" size={16} />
                            <div className="min-w-0">
                                <div className="text-xs font-medium text-gray-700 truncate">{p.structured_formatting?.main_text || p.description}</div>
                                <div className="text-[10px] text-gray-400 truncate">{p.structured_formatting?.secondary_text || ""}</div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
            {destResults.length > 0 && (
                <div className="mb-3 bg-white/60 backdrop-blur-2xl rounded-lg border border-white/20 shadow-sm overflow-hidden">
                    {destResults.slice(0, 4).map((p, i) => (
                        <button key={i} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/40 text-left transition-colors" onClick={() => selectPlace(p, "destination")}>
                            <MdPlace className="text-gray-400 shrink-0" size={16} />
                            <div className="min-w-0">
                                <div className="text-xs font-medium text-gray-700 truncate">{p.structured_formatting?.main_text || p.description}</div>
                                <div className="text-[10px] text-gray-400 truncate">{p.structured_formatting?.secondary_text || ""}</div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Get Directions button */}
            <button
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${!origin || !destination || loading
                    ? "bg-gray-200/50 text-gray-400 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600 text-white shadow-sm shadow-blue-200 hover:shadow-md"
                    }`}
                onClick={fetchDirections}
                disabled={!origin || !destination || loading}
            >
                {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : "Get Directions"}
            </button>

            {/* Route info card */}
            {routeInfo && (
                <div className="mt-4 animate-fade-in">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg shadow-blue-200/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-2xl font-bold">{routeInfo.duration}</div>
                                <div className="text-blue-100 text-xs mt-0.5">{routeInfo.distance}</div>
                            </div>
                            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 text-xs text-white/90">
                                {mode === "driving" ? <MdDirectionsCar size={14} /> : <MdDirectionsWalk size={14} />}
                                {mode === "driving" ? "Driving" : "Walking"}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Turn-by-turn steps */}
            {steps.length > 0 && (
                <div className="mt-3">
                    <button
                        onClick={() => setShowSteps(!showSteps)}
                        className="w-full text-left text-xs font-medium text-blue-500 hover:text-blue-600 py-2 transition-colors"
                    >
                        {showSteps ? "Hide" : "Show"} {steps.length} steps
                    </button>

                    {showSteps && (
                        <div className="space-y-0 animate-fade-in bg-white/50 backdrop-blur-xl rounded-xl p-3 border border-white/20">
                            {steps.map((step, i) => {
                                const Icon = getManeuverIcon(step.maneuver);
                                return (
                                    <div key={i} className="flex gap-3 py-2.5 border-b border-gray-200/30 last:border-0">
                                        <div className="w-7 h-7 shrink-0 flex items-center justify-center rounded-full bg-blue-50 text-blue-500 mt-0.5">
                                            <Icon size={14} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs text-gray-700 leading-relaxed">
                                                {step.instruction}
                                            </div>
                                            {(step.distance || step.duration) && (
                                                <div className="flex gap-2 mt-1 text-[10px] text-gray-400">
                                                    {step.distance && <span>{step.distance}</span>}
                                                    {step.distance && step.duration && <span>·</span>}
                                                    {step.duration && <span>{step.duration}</span>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DirectionsPanel;
