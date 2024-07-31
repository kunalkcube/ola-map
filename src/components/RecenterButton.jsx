import React from "react";
import { MdOutlineMyLocation } from "react-icons/md";

const RecenterButton = ({ handleRecenter }) => (
    <button
        onClick={handleRecenter}
        className="absolute bottom-10 right-4 p-2 bg-white/10 backdrop-blur-md rounded-full shadow-md hover:bg-white/50 focus:outline-none"
        aria-label="Recenter map on current location"
    >
        <MdOutlineMyLocation size={24} color="#333" />
    </button>
);

export default RecenterButton;
