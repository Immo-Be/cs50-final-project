"use client";

import { useState } from "react";

interface CreditsProps {
  className?: string;
}

const Credits: React.FC<CreditsProps> = ({ className = "" }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`fixed max-w-lg bottom-4 right-4 z-10 ${className}`}>
      <div
        className={`
          bg-black/50 backdrop-blur-lg rounded-lg p-4 mb-2 text-white
          transition-all duration-300 ease-in-out overflow-hidden
          ${isExpanded ? "max-h-64 opacity-100" : "max-h-0 opacity-0 pointer-events-none"}
        `}
      >
        <h3 className="text-lg font-bold mb-2">Credits</h3>
        <div className="space-y-2 text-sm">
          <p>
            Earth Visualization based on{" "}
            <a
              href="https://threejs-journey.com/lessons/earth-shaders#earth-textures"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-300 hover:underline"
            >
              Bruno Simon Three.js Journey
            </a>
          </p>
          <p>Flight Data from <a
              href="https://portal.api.hamburg-airport.de/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-300 hover:underline"
            >Hamburg Airport API</a></p>
          <p>
            Earth textures based on NASA elevation and imagery data. Colors and
            shades are tuned according to true-color photos made by Messenger,
            Viking and Cassini spacecrafts, and the Hubble Space Telescope.{" "}
            <a
              href="https://www.solarsystemscope.com/textures/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-300 hover:underline"
            >
            Courtesy of Solar System Scope
            </a>
          </p>
          <p>Built with Next.js, React Three Fiber (Three.js), TypeScript and Tailwind</p>
          <p>Deployed on Firebase App Hosting</p>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="mt-3 text-xs underline"
        >
          Close
        </button>
      </div>

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-full shadow-lg
                  transition-transform duration-150 ease-in-out 
                  hover:scale-105 active:scale-95"
      >
        {isExpanded ? "×" : "Credits"}
      </button>
    </div>
  );
};

export default Credits;
