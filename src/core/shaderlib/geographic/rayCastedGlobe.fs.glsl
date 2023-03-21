precision mediump float;

#include <common>
#include <ray_intersects_sphere>

varying vec3 v_WorldPosition;
uniform vec3 u_CameraPos;
uniform vec3 u_CameraPosSquared;
uniform vec3 u_GlobeOneOverRadiiSquared;
uniform vec3 u_PointLightPosition;
uniform vec4 u_DiffuseSpecularAmbientShininess;
uniform sampler2D u_Sampler;

vec3 GeodeticSurfaceNormal(vec3 positionOnEllipsoid, vec3 oneOverEllipsoidRadiiSquared)
{
    return normalize(positionOnEllipsoid * oneOverEllipsoidRadiiSquared);
}

float LightIntensity(vec3 normal, vec3 toLight, vec3 toEye, vec4 diffuseSpecularAmbientShininess)
{
    vec3 toReflectedLight = reflect(-toLight, normal);

    float diffuse = max(dot(toLight, normal), 0.0);
    float specular = max(dot(toReflectedLight, toEye), 0.0);
    specular = pow(specular, diffuseSpecularAmbientShininess.w);

    return (diffuseSpecularAmbientShininess.x * diffuse) +
        (diffuseSpecularAmbientShininess.y * specular) +
            diffuseSpecularAmbientShininess.z;
}

vec2 ComputeTextureCoordinates(vec3 normal)
{
    return vec2(atan(normal.x, normal.z) * oneOverTwoPi + 0.5, asin(normal.y) * oneOverPi + 0.5);
}

void main()
{
    vec3 rayDirection = normalize(v_WorldPosition - u_CameraPos);
    Intersection i = RayIntersectEllipsoid(u_CameraPos, u_CameraPosSquared, rayDirection, u_GlobeOneOverRadiiSquared);

    if (i.Intersects)
    {
        vec3 position = u_CameraPos + (i.NearTime * rayDirection);
        vec3 normal = GeodeticSurfaceNormal(position, u_GlobeOneOverRadiiSquared);

        vec3 toLight = normalize(u_CameraPos - position);
        vec3 toEye = normalize(u_CameraPos - position);

        float intensity = LightIntensity(normal, toLight, toEye, u_DiffuseSpecularAmbientShininess);

        // gl_FragColor = vec4(intensity * texture2D(u_Sampler, ComputeTextureCoordinates(normal)).rgb, 1.0);
        gl_FragColor = texture2D(u_Sampler, ComputeTextureCoordinates(normal));
    }
    else
    {
        discard;
    }
}