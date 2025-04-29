"use client";
import { useMemo, useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import { FlightPathData } from "../page";


interface FlightPathProps {
  paths: FlightPathData[];
  earthRadius: number;
  scene: THREE.Scene | null;
}

// Create flight path using shaders
// Convert latitude and longitude to 3D position on sphere
const latLongToVector3 = (
  lat: number,
  lng: number,
  radius: number,
): THREE.Vector3 => {
  // Convert latitude and longitude from degrees to radians
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  // Calculate the position
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return new THREE.Vector3(x, y, z);
};

// FlightPath component
const FlightPath = ({ paths, earthRadius, scene }: FlightPathProps) => {
  // Store references to created objects for cleanup
  const flightPathObjects = useRef<(THREE.Object3D & { 
    update?: (time: number) => void; 
    reset?: () => void;
  })[]>([]);

  // Create a flying particle along the path
  const createFlyingParticle = (
    scene: THREE.Scene,
    curve: THREE.QuadraticBezierCurve3,
    id: string,
    color: string = "#00ffff"
  ) => {
    // Create particle with custom shader
    const particleGeometry = new THREE.BufferGeometry();
    
    // Initialize with the first point position
    const firstPoint = curve.getPoint(0);
    const positions = new Float32Array([firstPoint.x, firstPoint.y, firstPoint.z]);
    
    particleGeometry.setAttribute(
      "position", 
      new THREE.BufferAttribute(positions, 3)
    );
    
    // Convert string color to THREE.Color
    const particleColor = new THREE.Color(color);
    
    // Create particle material with glow effect
    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: particleColor }
      },
      vertexShader: `
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 8.0;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        
        void main() {
          // Create circular point with soft edges
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          
          // Discard pixels outside the circle
          if (dist > 0.5) discard;
          
          // Create soft glow effect
          float strength = 0.5 - dist;
          float alpha = pow(strength, 2.0);
          
          // Final color with glow
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false
    });
    
    const particle = new THREE.Points(particleGeometry, particleMaterial) as THREE.Points & { reset?: () => void; update?: (time: number) => void };
    particle.renderOrder = 3; // Highest render order for the moving particle
    particle.name = `particle-${id}`;
    // scene.add(particle);
    
    // Create trailing glow effect
    const trailGeometry = new THREE.BufferGeometry();
    const trailPositions = new Float32Array(30 * 3); // Store 30 previous positions
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    
    const trailMaterial = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: particleColor }
      },
      vertexShader: `
        attribute float size;
        attribute float alpha;
        varying float vAlpha;
        
        void main() {
          vAlpha = alpha;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying float vAlpha;
        
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          
          float strength = 0.5 - dist;
          float alpha = vAlpha * pow(strength, 2.0);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false
    });
    
    // Add size and alpha attributes for trail effect
    const trailSizes = new Float32Array(30);
    const trailAlphas = new Float32Array(30);
    
    for (let i = 0; i < 30; i++) {
      trailSizes[i] = 7.0 - i * 0.2;
      trailAlphas[i] = 0.7 - i * 0.023;
    }
    
    trailGeometry.setAttribute('size', new THREE.BufferAttribute(trailSizes, 1));
    trailGeometry.setAttribute('alpha', new THREE.BufferAttribute(trailAlphas, 1));
    
    const trail = new THREE.Points(trailGeometry, trailMaterial);
    trail.renderOrder = 2;
    trail.name = `trail-${id}`;
    scene.add(trail);
    flightPathObjects.current.push(trail);
    
    // Previous positions array for trail effect
    const prevPositions: THREE.Vector3[] = [];
    
    // Reset function to clear the trail
    const resetTrail = () => {
      prevPositions.length = 0;
      
      // Clear trail geometry positions
      const positions = trail.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < 30; i++) {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = 0;
      }
      trail.geometry.attributes.position.needsUpdate = true;
    };
    
    // Add reset method to the particle
    (particle).reset = resetTrail;
    
    // Update function for particle and trail
    const updateParticle = (time: number) => {
      // Move particle along path (adjust speed as needed)
      const t = (time * 0.2) % 1;
      const point = curve.getPoint(t);
      particle.position.copy(point);
      
      // Clear previous positions when completing a loop
      // This prevents "explosion" artifacts
      const previousT = ((time - 0.01) * 0.2) % 1;
      if (previousT > t) {
        // We've looped around - reset the trail
        prevPositions.length = 0;
      }
      
      // Add current position to the trail
      prevPositions.unshift(point.clone());
      
      // Keep only 30 recent positions
      if (prevPositions.length > 30) {
        prevPositions.pop();
      }
      
      // Update trail geometry
      const positions = trail.geometry.attributes.position.array as Float32Array;
      
      // First, clear all positions to avoid artifacts
      for (let i = 0; i < 30; i++) {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = 0;
      }
      
      // Then set only valid positions
      for (let i = 0; i < prevPositions.length; i++) {
        positions[i * 3] = prevPositions[i].x;
        positions[i * 3 + 1] = prevPositions[i].y;
        positions[i * 3 + 2] = prevPositions[i].z;
      }
      
      trail.geometry.attributes.position.needsUpdate = true;
    };
    
    // Store update function
    (particle).update = updateParticle;
    
    flightPathObjects.current.push(particle);
    return particle;
  };

  const createShaderFlightPath = useCallback( (
    scene: THREE.Scene,
    startPos: THREE.Vector3,
    endPos: THREE.Vector3,
    color: string = "#ffffff",
    id: string,
  ) => {
      // Calculate path parameters
      const distance = startPos.distanceTo(endPos);
      const midPoint = new THREE.Vector3()
      .addVectors(startPos, endPos)
      .multiplyScalar(0.5);

      const normal = midPoint.clone().normalize();
      const arcHeight = distance * 0.15;
      midPoint.add(normal.multiplyScalar(arcHeight));

      // Create a curve for the path
      const curve = new THREE.QuadraticBezierCurve3(startPos, midPoint, endPos);

      // Create path points
      const segments = 100;
      const points = [];
      const tangents = [];

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const point = curve.getPoint(t);
        points.push(point);

        // Calculate tangent for shader
        const tangent = curve.getTangent(t);
        tangents.push(tangent);
      }

      // Create geometry
      const geometry = new THREE.BufferGeometry();

      // Add positions and progress attributes for shader animation
      const positions = new Float32Array(segments * 3 + 3);
      const progress = new Float32Array(segments + 1);

      for (let i = 0; i <= segments; i++) {
        const point = points[i];
        positions[i * 3] = point.x;
        positions[i * 3 + 1] = point.y;
        positions[i * 3 + 2] = point.z;
        progress[i] = i / segments;
      }

      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("progress", new THREE.BufferAttribute(progress, 1));

      // Create material with custom shader
      const colorObj = new THREE.Color(color);
      const material = new THREE.ShaderMaterial({
        vertexShader: `
attribute float progress;
uniform float uTime;
uniform float uLength;
uniform float uSpeed;

varying float vProgress;
varying float vAlpha;

void main() {
vProgress = progress;

// Calculate dash pattern
float dashPosition = mod(progress * uLength + uTime * uSpeed, 1.0);
vAlpha = smoothstep(0.0, 0.1, dashPosition) * smoothstep(0.4, 0.3, dashPosition);

gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
gl_PointSize = 2.0;
}
`,
        fragmentShader: `
uniform vec3 uColor;
varying float vProgress;
varying float vAlpha;

void main() {
if (vAlpha < 0.1) discard;
gl_FragColor = vec4(uColor, vAlpha);
}
`,
        uniforms: {
          uColor: { value: colorObj },
          uTime: { value: 0 },
          uLength: { value: 1.0 },
          uSpeed: { value: 0.5 },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      // Create the final path
      const flightPath = new THREE.Line(geometry, material);

      // Ensure flight path is always rendered on top of the Earth
      flightPath.renderOrder = 1;
      material.depthTest = false; // Disable depth testing to always render on top

      flightPath.name = `flightPath-${id}`;

      scene.add(flightPath);
      flightPathObjects.current.push(flightPath);

      // Create custom airport markers
      const createAirportMarker = (position: THREE.Vector3, isStart: boolean, name: string) => {
        const markerGroup = new THREE.Group();
        markerGroup.position.copy(position);
        markerGroup.name = name;
        markerGroup.renderOrder = 2;

        // Base marker (smaller)
        const baseGeometry = new THREE.RingGeometry(0.001, 0.005, 16);
        const baseMaterial = new THREE.MeshBasicMaterial({
          color: isStart ? 0x00ffff : 0xff8800,
          transparent: true,
          opacity: 0.2,
          depthTest: false,
          side: THREE.DoubleSide
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);

        // Align with surface normal
        const normal = position.clone().normalize();
        base.lookAt(normal.clone().multiplyScalar(-1));

        // Center icon
        const centerGeometry = isStart 
          ? new THREE.CircleGeometry(0.008, 16) 
          : new THREE.RingGeometry(0.003, 0.008, 16);
        const centerMaterial = new THREE.MeshBasicMaterial({
          color: isStart ? 0x00ffff : 0xff8800,
          transparent: true,
          opacity: 0.9,
          depthTest: false,
          side: THREE.DoubleSide
        });
        const center = new THREE.Mesh(centerGeometry, centerMaterial);
        center.lookAt(normal.clone().multiplyScalar(-1));
        center.position.copy(normal.clone().multiplyScalar(0.001));

        // Pulse ring (animated)
        // const pulseGeometry = new THREE.RingGeometry(0.01, 0.012, 16);
        // const pulseMaterial = new THREE.ShaderMaterial({
        //   uniforms: {
        //     color: { value: new THREE.Color(isStart ? 0x00ffff : 0xff8800) },
        //     time: { value: 0 }
        //   },
        //   vertexShader: `
        //     varying vec2 vUv;
        //     void main() {
        //       vUv = uv;
        //       gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        //     }
        //   `,
        //   fragmentShader: `
        //     uniform vec3 color;
        //     uniform float time;
        //     varying vec2 vUv;
        //
        //     void main() {
        //       float pulse = 0.5 + 0.5 * sin(time * 3.0);
        //       float alpha = pulse * 0.7;
        //       gl_FragColor = vec4(color, alpha);
        //     }
        //   `,
        //   transparent: true,
        //   depthTest: false,
        //   side: THREE.DoubleSide
        // });

        // const pulse = new THREE.Mesh(pulseGeometry, pulseMaterial);
        // pulse.lookAt(normal.clone().multiplyScalar(-1));
        // pulse.position.copy(normal.clone().multiplyScalar(0.0015));

        // Add directional triangles for departure airports
        // if (isStart) {
        //   const indicatorSize = 0.008;
        //   const indicators = [];
        //
        //   for (let i = 0; i < 4; i++) {
        //     const angle = (Math.PI / 2) * i;
        //     const indicatorGeo = new THREE.BufferGeometry();
        //
        //     // Create a small triangle pointing outward
        //     const vertices = new Float32Array([
        //       0, 0, 0,
        //       indicatorSize * Math.cos(angle), indicatorSize * Math.sin(angle), 0,
        //       indicatorSize * Math.cos(angle + Math.PI/8), indicatorSize * Math.sin(angle + Math.PI/8), 0
        //     ]);
        //
        //     indicatorGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        //     const indicatorMat = new THREE.MeshBasicMaterial({
        //       color: 0x00ffff,
        //       transparent: true,
        //       opacity: 0.8,
        //       depthTest: false,
        //       side: THREE.DoubleSide
        //     });
        //
        //     const indicator = new THREE.Mesh(indicatorGeo, indicatorMat);
        //     indicator.lookAt(normal.clone().multiplyScalar(-1));
        //     indicator.position.copy(normal.clone().multiplyScalar(0.002));
        //
        //     // Position indicators around the center
        //     indicator.translateX(0.024 * Math.cos(angle));
        //     indicator.translateY(0.024 * Math.sin(angle));
        //
        //     indicators.push(indicator);
        //   }
        //
        //   indicators.forEach(ind => markerGroup.add(ind));
        // }

        markerGroup.add(base);
        markerGroup.add(center);
        // markerGroup.add(pulse);

        // Add to animation update list
        // const updateFn = (time: number) => {
        //   (pulse.material as THREE.ShaderMaterial).uniforms.time.value = time;
        // };
        //
        // Store update function
        // (markerGroup as any).update = updateFn;

        return markerGroup;
      };

      // Create start marker
      const startMarker = createAirportMarker(startPos, true, `startMarker-${id}`);
      scene.add(startMarker);

      flightPathObjects.current.push(startMarker);

      // Create end marker
      const endMarker = createAirportMarker(endPos, false, `endMarker-${id}`);
      scene.add(endMarker);
      flightPathObjects.current.push(endMarker);

      // Create animated particle along the path
      const particle = createFlyingParticle(scene, curve, id, color);

      return {
        flightPath,
        startMarker,
        endMarker,
        particle
      };
    }, [] );
  // Convert flight path data to shader-friendly format
  useMemo(() => {
    if (!scene) return null;

    // Clean up previous flight paths
    flightPathObjects.current.forEach((object) => {
      scene.remove(object);
    });
    flightPathObjects.current = [];

    // Create flight paths
    paths.forEach((path) => {
      // Get positions from lat/long
      const startPosition = latLongToVector3(
        path.start.lat,
        path.start.lng,
        earthRadius,
      );
      const endPosition = latLongToVector3(
        path.destination.lat,
        path.destination.lng,
        earthRadius,
      );

      // Create flight path with shader
      createShaderFlightPath(
        scene,
        startPosition,
        endPosition,
        path.color || "#00ffff",
        path.id,
      );
    });

    return true;
  }, [paths, earthRadius, scene, createShaderFlightPath]);

  // Set up animation loop for markers
  useEffect(() => {
    if (!scene) return;
    
    // Get current animation frame if it exists
    const animationFrame = (window).__airportMarkersAnimationFrame;
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
    
    // Store previous time to detect large time jumps
    let prevTime = 0;
    
    // Animation function
    const animate = (time: number) => {
      const normalizedTime = time * 0.001; // Convert to seconds
      
      // Detect time jumps (e.g., tab becoming active again)
      // This prevents particle trails from "exploding" after inactivity
      if (Math.abs(normalizedTime - prevTime) > 1.0) {
        // Reset all particle trails
        flightPathObjects.current.forEach(obj => {
          if (obj.name?.startsWith('particle-') && (obj).reset) {
            (obj).reset();
          }
        });
      }
      
      prevTime = normalizedTime;
      
      // Find all markers in flightPathObjects and update them
      flightPathObjects.current.forEach(obj => {
        if ((obj).update) {
          (obj).update(normalizedTime);
        }
      });
      
      // Store frame reference for cleanup
      (window).__airportMarkersAnimationFrame = requestAnimationFrame(animate);
    };
    
    // Start animation
    (window).__airportMarkersAnimationFrame = requestAnimationFrame(animate);
    
    // Cleanup function
    return () => {
      if ((window).__airportMarkersAnimationFrame) {
        cancelAnimationFrame((window).__airportMarkersAnimationFrame);
      }
    };
  }, [scene, flightPathObjects.current.length]);

  // Return empty fragment
  return null;
};

export default FlightPath;
