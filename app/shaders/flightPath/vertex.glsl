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

