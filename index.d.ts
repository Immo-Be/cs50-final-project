export {};

declare global {
  interface Window {
   __airportMarkersAnimationFrame: number;
  }
}

window.__airportMarkersAnimationFrame = window.__airportMarkersAnimationFrame || {};
