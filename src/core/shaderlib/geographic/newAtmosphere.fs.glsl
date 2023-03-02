precision mediump float;

const float oneOverTwoPi = 0.15915494309189535;
const float oneOverPi = 0.3183098861837907;

varying vec3 v_OuterPosWC;

uniform vec3 u_CameraPos;
uniform vec3 u_CameraPosSquared;
uniform vec3 u_GlobeOneOverRadiiSquared;
uniform vec3 u_AtmosphereOneOverRadiiSquared;
uniform vec3 u_PointLightPosition;
uniform vec3 u_DiffuseSpecularAmbientShininess;
uniform vec3 u_SunPos;
uniform float u_AtmosphereRayleighScaleHeight;
uniform float u_AtmosphereRayleighCoefficient;// vec3 RGB


uniform float u_AtmosphereLightIntensity;
// uniform float u_AtmosphereInnerRadius;
uniform float u_GlobeRadius;
uniform float u_AtmosphereThickness;


uniform int u_ViewSamples; // cesium is 16
uniform int u_LightSamples; // cesium is 4

struct Intersection {
    bool Intersects;
    float NearTime;
    float FarTime;
}

Intersection RayIntersectSphere(vec3 ray, vec3 rayOrigin, float radius) {
    // TODO

}

Intersection RayIntersectEllipsoid(vec3 rayOrigin, vec3 rayOriginSquared, vec3 rayDirection, vec3 oneOverEllipsoidRadiiSquared)
{
    float a = dot(rayDirection * rayDirection, oneOverEllipsoidRadiiSquared);
    float b = 2.0 * dot(rayOrigin * rayDirection, oneOverEllipsoidRadiiSquared);
    float c = dot(rayOriginSquared, oneOverEllipsoidRadiiSquared) - 1.0;
    float discriminant = b * b - 4.0 * a * c;

    if (discriminant < 0.0)
    {
        return Intersection(false, 0.0, 0.0);
    }
    else if (discriminant == 0.0)
    {
        float time = -0.5 * b / a;
        return Intersection(true, time, time);
    }

    float t = -0.5 * (b + (b > 0.0 ? 1.0 : -1.0) * sqrt(discriminant));
    float root1 = t / a;
    float root2 = c / t;

    return Intersection(true, min(root1, root2), max(root1, root2));
}

vec3 GeodeticSurfaceNormal(vec3 positionOnEllipsoid, vec3 oneOverEllipsoidRadiiSquared)
{
    return normalize(positionOnEllipsoid * oneOverEllipsoidRadiiSquared);
}

float LightSampling(vec3 P, vec3 lightDirection) {
    // 计算采样点的太阳光方向到大气层外层的相交
    // 采样点一定在大气层内部，检测光线与地球相交的函数需要重写
    // TODO
    Intersection iLAtmosphere = RayIntersectEllipsoid(P, pSquared, lightDirection, u_AtmosphereOneOverRadiiSquared);
    
    float opticalDepthCP = 0;
    // 在PC上采样
    float time = 0;
    float ds = distance(P, P + lightDirection * iLAtmosphere.NearTime)/ (float) (u_LightSamples);
    for (int i = 0; i < u_LightSamples; i++) {
        vec3 Q = p + lightDirection * (time + ds * 0.5);
        float height = length(Q) - u_GlobeRadius;

        if (height < 0) return 0;

        // optical depth for the light ray
        opticalDepthCP += exp(-height/ RayScaleHeight) * ds;

        time += ds;
    }
    return opticalDepthCP;
}

void main() {
    // 太阳光
    vec3 lightDirection = normalize(u_SunPos);
    vec3 lightDirection2 = normalize(v_OuterPosWC);
    
    // 相机到大气层外层的光线方向
    vec3 rayDirection = normalize(v_OuterPosWC - u_CameraPos);
    // 计算大气层外层的半径，可以放到CPU。假设通过u_AtmosphereOneOverRadiiSquared传入
    // 假设大气层是球体，u_AtmosphereOneOverRadiiSquared的每个分量相同
    // ceisum设置opacity变量来确定不透明度，光线与大气层外层不相交时，opcity = 0, 此处先不考虑
    // 突然想到通过opacity的值就可以在不考虑 光线与地球相交的情况

    Intersection iGlobe = RayIntersectEllipsoid(u_CameraPos, u_CameraPosSquared, rayDirection, u_GlobeOneOverRadiiSquared);
    Intersection iAtmosphereOuter = RayIntersectEllipsoid(u_CameraPos, u_CameraPosSquared, rayDirection, u_AtmosphereOneOverRadiiSquared);

    // if (!iAtmosphereOuter.Intersects) discard;
    // 加入相机在大气层内部，NearTime应该为0。这里现不做考虑相机在大气层内的情况
    // iAtmosphereOuter.NearTime = max(iAtmosphereOuter.NearTime, 0.0);
    // iAtmosphereOuter.FarTime = min(iAtmosphereOuter.FarTime, length(rayLength));

    if (iAtmosphereOuter.Intersects && !iGlobe.Intersects) {
        
        // 数值积分计算 采样点的光的贡献
        float totalViewSamples = 0;
        float time = iAtmosphere.NearTime;
        // 采样片段的长度
        float ds = (iAtmosphere.FarTime - iAtmosphere.NearTime) / (float) (u_ViewSamples);

        // 累积optical depth for PA（采样点到入射点）
        float opticalDepthPA = 0;

        for (int i = 0; i < u_ViewSamples; i++) {
            // 采样点的位置
            vec3 samplePos = u_CameraPos + rayDirection * (time + ds * 0.5);

            float sampleHeight = length(samplePos) - u_GlobeRadius;
        
            // 当前采样片段的Optical depth
            float opticalDepthSegment = exp(-sampleHeight / u_AtmosphereRayleighScaleHeight) * ds;
            // 累积optical depths
            opticalDepthPA += opticalDepthSegment;

            // D(CP):累积optical depth for CP,采样点到太阳光 
            float opticalDepthCP = LightSampling(samplePos, lightDirection);

            // T(CP) * T(PA) = exp{ -β(λ)[D(CP) + D{PA}]}
            float transmittance = exp(
                -u_AtmosphereRayleighCoefficient * (opticalDepthCP + opticalDepthPA)
            )

            // T(CP) * T(PA) * ρ(h) * ds
            totalViewSamples += transmittance * opticalDepthSegment;
            time += ds;
        }
        // 没理解：cesium的一个变量作为最后颜色的透明度: Compute the transmittance i.e. how much light is passing through the atmosphere.
        // float optical = length(exp(-u_AtmosphereRayleighCoefficient * opticalDepthPA));
        float cosTheta = dot(lightDirection, rayDirection);
        float cosThetaSq = cosTheta * cosTheta;
        float phase = 3.0 / 16.0 * oneOverPi * (1.0 + cosThetaSq);
        // I = IS * beta(lamda) * gamma(theta) * totalViewSamples
        vec3 I = u_AtmosphereLightIntensity * u_AtmosphereRayleighScaleHeight * phase * totalViewSamples;
        
        
        gl_FragColor = vec4(I,1.0);
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    } else {
        discard;
    }
}