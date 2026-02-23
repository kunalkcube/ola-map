import React from "react";
import { MdSearch, MdDirections, MdNearMe, MdTerrain, MdLocationOn, MdMap, MdClose, MdMenu, MdTextFields, MdEditRoad, MdGridView, MdRoute, MdRadar, MdImage } from "react-icons/md";

const tabs = [
    { id: "search", icon: MdSearch, label: "Search" },
    { id: "directions", icon: MdDirections, label: "Directions" },
    { id: "nearby", icon: MdNearMe, label: "Nearby" },
    { id: "textsearch", icon: MdTextFields, label: "Text Search" },
    { id: "elevation", icon: MdTerrain, label: "Elevation" },
    { id: "geocode", icon: MdLocationOn, label: "Geocode" },
    { id: "styles", icon: MdMap, label: "Styles" },
    { id: "roads", icon: MdEditRoad, label: "Roads" },
    { id: "matrix", icon: MdGridView, label: "Distance Matrix" },
    { id: "optimizer", icon: MdRoute, label: "Route Optimizer" },
    { id: "geofencing", icon: MdRadar, label: "Geofencing" },
    { id: "staticmap", icon: MdImage, label: "Static Map" },
];

const Sidebar = ({ activePanel, setActivePanel, children, mobileOpen, setMobileOpen }) => {
    return (
        <>
            {/* Mobile hamburger */}
            {!mobileOpen && (
                <button
                    onClick={() => setMobileOpen(true)}
                    className="md:hidden fixed top-4 left-4 z-30 w-11 h-11 flex items-center justify-center rounded-full bg-white/60 backdrop-blur-2xl shadow-lg border border-white/30 hover:shadow-xl transition-all active:scale-95"
                >
                    <MdMenu size={22} className="text-gray-700" />
                </button>
            )}

            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/30 z-20 backdrop-blur-[3px] transition-opacity"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar container */}
            <div className={`
        fixed top-0 left-0 bottom-0 z-20 flex transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
                {/* Nav strip */}
                <nav className="relative flex flex-col gap-1 p-2 pt-4 bg-white/60 backdrop-blur-2xl border-r border-white/20 shadow-lg w-14 shrink-0 overflow-y-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            className={`
                w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 shrink-0
                ${activePanel === tab.id
                                    ? "bg-blue-500 text-white shadow-md shadow-blue-200"
                                    : "text-gray-500 hover:bg-black/5 hover:text-gray-700"
                                }
              `}
                            onClick={() => {
                                setActivePanel(activePanel === tab.id ? null : tab.id);
                            }}
                            title={tab.label}
                        >
                            <tab.icon size={20} />
                        </button>
                    ))}

                    <button
                        onClick={() => setMobileOpen(false)}
                        className="md:hidden mt-auto w-10 h-10 flex items-center justify-center rounded-full text-gray-400 hover:bg-black/5 hover:text-gray-600 transition-all shrink-0"
                        title="Close sidebar"
                    >
                        <MdClose size={20} />
                    </button>
                </nav>

                {/* Panel content */}
                {activePanel && (
                    <div className="w-[340px] max-w-[calc(100vw-56px)] h-full bg-white/70 backdrop-blur-2xl shadow-xl overflow-y-auto animate-slide-in border-r border-white/20">
                        <div className="p-5 pb-8">
                            {children}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default Sidebar;
