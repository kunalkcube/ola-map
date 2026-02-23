import React from "react";
import { MdStraighten, MdAccessTime } from "react-icons/md";

const DistanceDuration = ({ distance, duration }) => {
    if (!distance && !duration) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-5 px-5 py-3 bg-white/60 backdrop-blur-2xl rounded-2xl shadow-lg shadow-black/10 border border-white/30 animate-slide-up">
            {distance && (
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                        <MdStraighten size={18} />
                    </div>
                    <div>
                        <div className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">Distance</div>
                        <div className="text-sm font-semibold text-gray-800">{distance}</div>
                    </div>
                </div>
            )}
            {distance && duration && <div className="w-px h-8 bg-gray-300/50" />}
            {duration && (
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-500/10 text-green-500">
                        <MdAccessTime size={18} />
                    </div>
                    <div>
                        <div className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">Duration</div>
                        <div className="text-sm font-semibold text-gray-800">{duration}</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DistanceDuration;
