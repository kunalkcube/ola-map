import React from "react";
import { MdOutlineMyLocation } from "react-icons/md";

const RecenterButton = ({ handleRecenter }) => (
    <button
        onClick={handleRecenter}
        className="fixed bottom-6 right-5 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/60 backdrop-blur-2xl shadow-lg shadow-black/10 border border-white/30 text-gray-500 hover:text-blue-500 hover:shadow-xl transition-all"
        aria-label="Recenter map on current location"
    >
        <MdOutlineMyLocation size={20} />
    </button>
);

export default RecenterButton;
