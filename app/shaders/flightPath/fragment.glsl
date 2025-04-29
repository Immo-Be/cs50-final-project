uniform vec3 uColor;
varying float vProgress;
varying float vAlpha;
        
void main() {
  if (vAlpha < 0.1) discard;
  gl_FragColor = vec4(uColor, vAlpha);
}

