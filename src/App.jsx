import React, { useState, useEffect, useCallback, useRef } from "react";
import { Map as MapLibreMap, NavigationControl, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import OlaMapsClient from 'ola-map-sdk';
import DistanceDuration from "./components/DistanceDuration";
import RecenterButton from "./components/RecenterButton";

const API_KEY = import.meta.env.VITE_API_KEY;
const STYLE_NAME = "vintage-light";

function App() {
  const [map, setMap] = useState(null);
  const [styleURL, setStyleURL] = useState(null);
  const [autocompleteResults, setAutocompleteResults] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [marker, setMarker] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const mapContainer = useRef(null);
  const searchBoxRef = useRef(null);
  const suggestionsRef = useRef(null);

  const transformRequest = useCallback((url, resourceType) => {
    url = url.replace("app.olamaps.io", "api.olamaps.io");
    const separator = url.includes("?") ? "&" : "?";
    return {
      url: `${url}${separator}api_key=${API_KEY}`,
      resourceType
    };
  }, []);

  useEffect(() => {
    const client = new OlaMapsClient(API_KEY);

    const fetchStyleURL = async () => {
      try {
        const styleURL = `https://api.olamaps.io/tiles/vector/v1/styles/${STYLE_NAME}/style.json`;
        setStyleURL(styleURL);
      } catch (error) {
        console.error('Error fetching style URL:', error);
      }
    };

    fetchStyleURL();
  }, []);

  useEffect(() => {
    if (map || !styleURL) return;

    const newMap = new MapLibreMap({
      container: mapContainer.current,
      style: styleURL,
      center: [0, 0],
      zoom: 2,
      transformRequest,
    });

    newMap.addControl(new NavigationControl({ visualizePitch: false, showCompass: true }), "bottom-left");

    newMap.on("load", () => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition((position) => {
          const { longitude, latitude } = position.coords;
          setUserLocation({ lng: longitude, lat: latitude });
          new Marker().setLngLat([longitude, latitude]).addTo(newMap);
          newMap.flyTo({ center: [longitude, latitude], zoom: 14 });
        });
      }
    });

    setMap(newMap);

    return () => {
      newMap.remove();
    };
  }, [styleURL, transformRequest]);

  const debounce = (func, wait) => {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  };

  const handleAutocomplete = useCallback(debounce(async (query) => {
    const client = new OlaMapsClient(API_KEY);
    try {
      const result = await client.places.autocomplete(query);
      setAutocompleteResults(result.predictions || []);
    } catch (error) {
      console.error('Error during autocomplete:', error);
    }
  }, 300), []);

  const handleSearchInputChange = (e) => {
    const query = e.target.value.trim();
    if (query.length > 0) {
      handleAutocomplete(query);
    } else {
      setAutocompleteResults([]);
    }
  };

  const handleSuggestionClick = (place) => {
    searchBoxRef.current.value = place.description;
    setSelectedPlace(place);
    setAutocompleteResults([]);
    if (marker) {
      marker.remove();
      setMarker(null);
    }

    setDistance("");
    setDuration("");
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (selectedPlace) {
      const { lat, lng } = selectedPlace.geometry.location;

      if (marker) {
        map.flyTo({ center: [lng, lat], zoom: 14 });
        return;
      }

      const newMarker = new Marker().setLngLat([lng, lat]).addTo(map);
      setMarker(newMarker);
      map.flyTo({ center: [lng, lat], zoom: 14 });

      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const userCoords = {
            lat: position.coords.latitude,
            lon: position.coords.longitude
          };
          const client = new OlaMapsClient(API_KEY);
          try {
            const result = await client.routing.getDirections(
              userCoords,
              { lat, lon: lng },
              {
                alternatives: false,
                steps: true,
                overview: 'full',
                language: 'en',
                traffic_metadata: false
              }
            );
            setDistance(`${result.routes[0].legs[0].readable_distance} km`);
            setDuration(`${result.routes[0].legs[0].readable_duration}`);
          } catch (error) {
            console.error('Error fetching directions:', error);
          }
        }, (error) => {
          console.error('Error getting user location:', error);
        });
      } else {
        console.error('Geolocation is not supported by this browser.');
      }
    } else {
      console.error('No place selected.');
    }
  };

  const handleRecenter = () => {
    if (map && userLocation) {
      map.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 14 });
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden relative">
      <div
        ref={mapContainer}
        className="w-full h-full"
      />
      <div className="absolute top-0 left-0 right-0 z-10">
        <section>
          <div className="py-4 px-4 mx-auto max-w-screen-xl text-center lg:py-16 lg:px-12">
            <form id="search-form" className="max-w-xl mx-auto" onSubmit={handleFormSubmit}>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 flex items-center ps-3 z-10 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-900" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
                    fill="none" viewBox="0 0 20 20">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
                  </svg>
                </div>
                <input type="search" id="search-box" ref={searchBoxRef}
                  className="w-full p-4 ps-10 pe-16 text-sm text-gray-800 rounded-lg bg-white/10 backdrop-blur-md focus:outline-none placeholder-gray-800"
                  placeholder="Search for places" required onChange={handleSearchInputChange} />
                <button type="submit"
                  className="text-gray-800 absolute end-2.5 bottom-2.5 bg-gray-700/5 backdrop-blur-md hover:bg-white/20 focus:outline-none font-medium rounded-md text-sm px-4 py-2">Go</button>
              </div>
              <ul className={`mt-4 w-full space-y-1 list-none list-inside ${autocompleteResults.length === 0 ? 'hidden' : ''}`} id="suggestions" ref={suggestionsRef}>
                {autocompleteResults.map((place, index) => (
                  <li key={index} className="p-2 bg-white/10 backdrop-blur-md hover:bg-white/50 rounded-md cursor-pointer text-gray-800 text-start break-word" onClick={() => handleSuggestionClick(place)}>
                    {place.description}
                  </li>
                ))}
              </ul>
            </form>
          </div>
        </section>
      </div>
      <DistanceDuration distance={distance} duration={duration} />
      <RecenterButton handleRecenter={handleRecenter} />
    </div>
  );
}

export default App;
