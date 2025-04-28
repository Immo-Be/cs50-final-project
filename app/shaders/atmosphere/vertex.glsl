varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

// The uv is sent to the fragment as vUv and displayed on gl_FragColor
// The modelPosition is sent to the fragment as vPosition and used to calculate the viewDirection variable (vector going from the camera to the fragment position)
// The transformed normal is sent to the fragment as vNormal and normalized again as normal to prevent grid artifacts


void main()
{
    // Position
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewMatrix * modelPosition;

    // Model normal
    vec3 modelNormal = (modelMatrix * vec4(normal, 0.0)).xyz;

    // Varyings
    vUv = uv;
    vNormal = modelNormal;
    vPosition = modelPosition.xyz;
}
