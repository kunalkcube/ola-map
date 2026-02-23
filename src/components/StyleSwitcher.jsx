import React from "react";
import { MdCheck } from "react-icons/md";

const styles = [
    { id: "default-light-standard", name: "Light", category: "Default", colors: ["#f8f9fa", "#e9ecef", "#dee2e6"] },
    { id: "default-dark-standard", name: "Dark", category: "Default", colors: ["#1a1a2e", "#16213e", "#0f3460"] },
    { id: "default-light-lite", name: "Lite", category: "Default", colors: ["#ffffff", "#f1f3f5", "#e9ecef"] },
    { id: "default-dark-standard-satellite", name: "Satellite", category: "Default", colors: ["#1b4332", "#2d6a4f", "#40916c"] },
    { id: "eclipse-light-standard", name: "Eclipse Light", category: "Eclipse", colors: ["#fdf6e3", "#eee8d5", "#93a1a1"] },
    { id: "eclipse-dark-standard", name: "Eclipse Dark", category: "Eclipse", colors: ["#002b36", "#073642", "#586e75"] },
    { id: "bolt-light", name: "Bolt Light", category: "Bolt", colors: ["#f8f9fa", "#ffd166", "#ef476f"] },
    { id: "bolt-dark", name: "Bolt Dark", category: "Bolt", colors: ["#1a1a2e", "#ffd166", "#ef476f"] },
    { id: "vintage-light", name: "Vintage Light", category: "Vintage", colors: ["#fdf5e6", "#deb887", "#d2691e"] },
    { id: "vintage-dark", name: "Vintage Dark", category: "Vintage", colors: ["#2c1810", "#5c3317", "#8b4513"] },
    { id: "default-earth-standard", name: "Earth", category: "Earth", colors: ["#e8e0d4", "#c4b69c", "#8b7d6b"] },
    { id: "positron", name: "Positron", category: "OSM", colors: ["#f2f3f0", "#d8d8d6", "#b8b8b6"] },
    { id: "osm-bright", name: "OSM Bright", category: "OSM", colors: ["#f5f3ed", "#aad3df", "#e8e0d8"] },
    { id: "dark-matter", name: "Dark Matter", category: "OSM", colors: ["#1d1d1d", "#2b2b2b", "#3b3b3b"] },
];

const StyleSwitcher = ({ client, map, currentStyle, onStyleChange }) => {
    const handleSwitch = (styleId) => {
        if (!map || !client) return;
        const url = client.getStyleURL(styleId);
        map.setStyle(url);
        onStyleChange(styleId);
    };

    return (
        <div>
            <h2 className="text-base font-semibold text-gray-800 mb-4">Map Style</h2>
            <div className="grid grid-cols-2 gap-2">
                {styles.map((s) => (
                    <button
                        key={s.id}
                        onClick={() => handleSwitch(s.id)}
                        className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${currentStyle === s.id
                                ? "border-blue-400 bg-blue-50 shadow-sm shadow-blue-100"
                                : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                            }`}
                    >
                        {/* Color preview */}
                        <div className="w-full h-8 rounded-lg overflow-hidden flex">
                            {s.colors.map((c, i) => (
                                <div key={i} className="flex-1" style={{ background: c }} />
                            ))}
                        </div>
                        <div className={`text-[11px] font-medium ${currentStyle === s.id ? "text-blue-600" : "text-gray-600"}`}>
                            {s.name}
                        </div>
                        <div className="text-[9px] text-gray-400">{s.category}</div>
                        {currentStyle === s.id && (
                            <div className="absolute top-1.5 right-1.5 w-4 h-4 flex items-center justify-center rounded-full bg-blue-500 text-white">
                                <MdCheck size={12} />
                            </div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default StyleSwitcher;
