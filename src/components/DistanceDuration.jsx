import React from "react";

const DistanceDuration = ({ distance, duration }) => {
    if (!distance && !duration) return null;

    return (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 py-2 px-4 mx-auto rounded-md text-gray-800 bg-white/10 backdrop-blur-md w-fit">
            {distance && <div className="mb-1">{distance}</div>}
            {duration && <div>{duration}</div>}
        </div>
    );
};

export default DistanceDuration;
