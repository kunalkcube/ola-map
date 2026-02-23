import React from "react";
import { MdLocationOn, MdTerrain, MdDirections, MdFlag } from "react-icons/md";

const MapContextMenu = ({ x, y, lngLat, onClose, onAction }) => {
    if (!lngLat) return null;

    const items = [
        { id: "whats-here", icon: MdLocationOn, label: "What's here?", color: "text-blue-500" },
        { id: "elevation", icon: MdTerrain, label: "Get elevation", color: "text-green-500" },
        { id: "directions-from", icon: MdDirections, label: "Directions from here", color: "text-indigo-500" },
        { id: "directions-to", icon: MdFlag, label: "Directions to here", color: "text-red-500" },
    ];

    return (
        <>
            <div className="fixed inset-0 z-[99]" onClick={onClose} />
            <div
                className="fixed z-[100] min-w-[210px] bg-white/60 backdrop-blur-2xl rounded-xl shadow-xl shadow-black/10 border border-white/20 overflow-hidden animate-scale-in"
                style={{ left: x, top: y }}
            >
                <div className="px-3 py-2 border-b border-gray-200/30">
                    <span className="text-[10px] font-mono text-gray-400">
                        {lngLat.lat.toFixed(5)}, {lngLat.lng.toFixed(5)}
                    </span>
                </div>
                {items.map((item) => (
                    <button
                        key={item.id}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-white/40 transition-colors text-left"
                        onClick={() => { onAction(item.id, lngLat); onClose(); }}
                    >
                        <item.icon size={16} className={item.color} />
                        {item.label}
                    </button>
                ))}
            </div>
        </>
    );
};

export default MapContextMenu;
