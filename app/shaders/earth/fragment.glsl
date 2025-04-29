uniform sampler2D uDayTexture;
uniform sampler2D uNightTexture;
uniform sampler2D uSpecularCloudsTexture;

uniform vec3 uSunDirection;
uniform vec3 uAtmosphereDayColor;
uniform vec3 uAtmosphereTwilightColor;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;


void main()
{

    // Calculate view direction vector (from camera to fragment)
    // Used for view-dependent effects like specular highlights or environment reflections
    vec3 viewDirection = normalize(vPosition - cameraPosition);
    
    // Ensure the normal vector has unit length
    // Critical for accurate lighting calculations and reflections
    vec3 normal = normalize(vNormal);
    // vec3 color = vec3(vUv, 1.0);
    vec3 color = vec3(0.0);


    // We are going to save the dot of the uSunDirection with the normal in a float sunOrientation variable:
    // https://registry.khronos.org/OpenGL-Refpages/gl4/html/dot.xhtml
    // Calculate how directly the sun hits this point on the Earth's surface
    // dot product returns:
    //  - Positive values (0 to 1): Day side (surface facing the sun)
    //  - Value of 0: Terminator line (twilight zone where day meets night)
    //  - Negative values (-1 to 0): Night side (surface facing away from sun)
    float sunOrientation = dot(uSunDirection, normal);
    
    // Use this value as grayscale color to visualize day/night transition
    // (white = full daylight, black = night side, gray = twilight)
    // color = vec3(sunOrientation);

    // Pick the pixel from the texture
    // Day / night color
        // Also 
        // It’s looking good, but the clouds are fully white on the night side of the Earth. We could make them darker, but they would occlude the city lights, which we would like to avoid.

    // Instead, we are going to make them disappear when it’s night and we can do that by multiplying cloudsMix by dayMix that we used to mix between the day and night textures:

   float dayMix = smoothstep(- 0.25, 0.5, sunOrientation);
    vec3 dayColor = texture(uDayTexture, vUv).rgb;
    vec3 nightColor = texture(uNightTexture, vUv).rgb;

    // If dayMix is 0, use nightColor
    // If dayMix is 1, use dayColor
    color = mix(nightColor, dayColor, dayMix);

    // Specular cloud color
    // We only need to two first channels
    vec2 specularCloudColor = texture(uSpecularCloudsTexture, vUv).rg;

    // Clouds
    //     It seems to work, but the clouds are way too intense and cover most of the surface.

    // We are going to remap the value so that we only see what would have been the dense part of the clouds.

    // Use smoothstep on specularCloudColor.g with limits set between a 0.5 and 1.0 :
//     It’s looking good, but the clouds are fully white on the night side of the Earth. We could make them darker, but they would occlude the city lights, which we would like to avoid.
//
// Instead, we are going to make them disappear when it’s night and we can do that by multiplying cloudsMix by dayMix that we used to mix between the day and night textures:

    float cloudsMix = smoothstep(0.1, 1.0, specularCloudColor.g);
    cloudsMix *= dayMix;
    color = mix(color, vec3(1.0), cloudsMix);

    //As we said earlier, the atmosphere is more visible on the edges of the planet. We need the usual fresnel.
    // Fresnel
    float fresnel = dot(viewDirection, normal) + 1.0;
    // Let’s push the fresnel more on the edges by using a pow on it:
     fresnel = pow(fresnel, 2.0);


    // Atmosphere
    float atmosphereDayMix = smoothstep(- 0.5, 1.0, sunOrientation);
    vec3 atmosphereColor = mix(uAtmosphereTwilightColor, uAtmosphereDayColor, atmosphereDayMix);
    color = mix(color, atmosphereColor, fresnel * atmosphereDayMix);
    // color = nightColor;

        // Specular
    // this is the reflection of the earth
    // We can calculate it using the reflect function on the uSunDirection according to the normal, but be careful, we need the vector going from the sun toward the Earth, meaning we need to negate the uSunDirection:
   // Specular
    vec3 reflection = reflect(- uSunDirection, normal);
    float specular = - dot(reflection, viewDirection);
    // We use the r channel of the texture to modulate the specular intensity
    specular *= specularCloudColor.r;
    specular = max(specular, 0.0);
    specular = pow(specular, 32.0);
    vec3 specularColor = mix(vec3(1.0), atmosphereColor, fresnel);

    color += specular * specularColor;

    // Final color
    gl_FragColor = vec4(color, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}

