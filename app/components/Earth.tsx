"use client";

import { useRef, useEffect, useState, FunctionComponent } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import GUI from "lil-gui";

import earthVertexShader from "../shaders/earth/vertex.glsl";
import earthFragmentShader from "../shaders/earth/fragment.glsl";

import atmosphereVertexShader from "../shaders/atmosphere/vertex.glsl";
import atmosphereFragmentShader from "../shaders/atmosphere/fragment.glsl";

import FlightPath from "./FlightPath";
import { FlightPathData } from "../page";

interface EarthProps {
  flightPathsData: FlightPathData[];
}

const Earth: FunctionComponent<EarthProps> = ({ flightPathsData }) => {
  console.log("Flight Paths Data", flightPathsData);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scene, setScene] = useState<THREE.Scene | null>(null);
  const earthRadius = 2; // Same as in your Earth component

  useEffect(() => {
    if (!canvasRef.current) return;

    // Debug
    const gui = new GUI();

    // Canvas
    const canvas = canvasRef.current;

    // Scene
    const scene = new THREE.Scene();
    setScene(scene);

    // Loaders
    const textureLoader = new THREE.TextureLoader();

    /**
     * Sun
     */
    // Coordinates
    const sunSpherical = new THREE.Spherical(1, Math.PI * 0.5, 0.5);
    const sunDirection = new THREE.Vector3();

    /**
     * Earth
     */
    const earthParameters = {
      atmosphereDayColor: "#00aaff",
      atmosphereTwilightColor: "#ff6600",
    };

    const earthDayTexture = textureLoader.load("/earth/day.jpg");

    earthDayTexture.colorSpace = THREE.SRGBColorSpace;
    earthDayTexture.anisotropy = 8;

    const earthNightTexture = textureLoader.load("/earth/night.jpg");

    earthNightTexture.colorSpace = THREE.SRGBColorSpace;
    earthNightTexture.anisotropy = 8;

    const earthSpecularCloudsTexture = textureLoader.load(
      "/earth/specularClouds.jpg",
    );
    earthSpecularCloudsTexture.anisotropy = 8;

    const earthGeometry = new THREE.SphereGeometry(2, 64, 64);
    const earthMaterial = new THREE.ShaderMaterial({
      vertexShader: earthVertexShader,
      fragmentShader: earthFragmentShader,
      uniforms: {
        uDayTexture: new THREE.Uniform(earthDayTexture),
        uNightTexture: new THREE.Uniform(earthNightTexture),
        uSpecularCloudsTexture: new THREE.Uniform(earthSpecularCloudsTexture),
        uSunDirection: new THREE.Uniform(new THREE.Vector3(0, 0, 1)),
        uAtmosphereDayColor: new THREE.Uniform(
          new THREE.Color(earthParameters.atmosphereDayColor),
        ),
        uAtmosphereTwilightColor: new THREE.Uniform(
          new THREE.Color(earthParameters.atmosphereTwilightColor),
        ),
      },
    });

    // Debug
    const debugSun = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.1, 2),
      new THREE.MeshBasicMaterial(),
    );
    scene.add(debugSun);

    // Atmosphere
    const atmosphereMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      uniforms: {
        uSunDirection: new THREE.Uniform(new THREE.Vector3(0, 0, 1)),
        uAtmosphereDayColor: new THREE.Uniform(
          new THREE.Color(earthParameters.atmosphereDayColor),
        ),
        uAtmosphereTwilightColor: new THREE.Uniform(
          new THREE.Color(earthParameters.atmosphereTwilightColor),
        ),
      },
    });

    const atmosphere = new THREE.Mesh(earthGeometry, atmosphereMaterial);
    atmosphere.scale.set(1.04, 1.04, 1.04);

    scene.add(atmosphere);

    const updateSun = () => {
      // Sun direction
      sunDirection.setFromSpherical(sunSpherical);

      // Debug
      debugSun.position.copy(sunDirection).multiplyScalar(5);

      // Uniforms
      earthMaterial.uniforms.uSunDirection.value.copy(sunDirection);
      atmosphereMaterial.uniforms.uSunDirection.value.copy(sunDirection);
    };

    updateSun();
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(earth);

    gui.addColor(earthParameters, "atmosphereDayColor").onChange(() => {
      earthMaterial.uniforms.uAtmosphereDayColor.value.set(
        earthParameters.atmosphereDayColor,
      );
      atmosphereMaterial.uniforms.uAtmosphereDayColor.value.set(
        earthParameters.atmosphereDayColor,
      );
    });

    gui.addColor(earthParameters, "atmosphereTwilightColor").onChange(() => {
      earthMaterial.uniforms.uAtmosphereTwilightColor.value.set(
        earthParameters.atmosphereTwilightColor,
      );
      atmosphereMaterial.uniforms.uAtmosphereTwilightColor.value.set(
        earthParameters.atmosphereTwilightColor,
      );
    });

    // Tweaks
    gui.add(sunSpherical, "phi").min(0).max(Math.PI).onChange(updateSun);
    gui
      .add(sunSpherical, "theta")
      .min(-Math.PI)
      .max(Math.PI)
      .onChange(updateSun);

    /**
     * Sizes
     */
    const sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: Math.min(window.devicePixelRatio, 2),
    };

    const handleResize = () => {
      // Update sizes
      sizes.width = window.innerWidth;
      sizes.height = window.innerHeight;
      sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);

      // Update camera
      camera.aspect = sizes.width / sizes.height;
      camera.updateProjectionMatrix();

      // Update renderer
      renderer.setSize(sizes.width, sizes.height);
      renderer.setPixelRatio(sizes.pixelRatio);
    };

    window.addEventListener("resize", handleResize);

    /**
     * Camera
     */
    const camera = new THREE.PerspectiveCamera(
      25,
      sizes.width / sizes.height,
      0.1,
      100,
    );
    camera.position.x = 12;
    camera.position.y = 5;
    camera.position.z = 4;
    scene.add(camera);

    // Controls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;

    /**
     * Renderer
     */
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
    });
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(sizes.pixelRatio);
    renderer.setClearColor("#000011");

    /**
     * Animate
     */
    const clock = new THREE.Clock();

    const tick = () => {
      const elapsedTime = clock.getElapsedTime();

      // earth.rotation.y = elapsedTime * 0.1;

      // Update controls
      controls.update();

      // Update all shader-based flight path animations
      // scene.children.forEach((child) => {
      //   if (child.material && child.material.type === "ShaderMaterial") {
      //     if ("uniforms" in child.material && child.material.uniforms.uTime) {
      //       child.material.uniforms.uTime.value = elapsedTime;
      //     }
      //   }
      // });

      // Render
      renderer.render(scene, camera);

      // Call tick again on the next frame
      window.requestAnimationFrame(tick);
    };

    tick();

    return () => {
      // Cleanup
      window.removeEventListener("resize", handleResize);
      gui.destroy();
      renderer.dispose();
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="webgl"
        style={{ position: "fixed", top: 0, left: 0, outline: "none" }}
      />
      {/* Render FlightPath component with the scene */}
      <FlightPath
        paths={flightPathsData}
        earthRadius={earthRadius}
        scene={scene}
      />
    </>
  );
};

export default Earth;
