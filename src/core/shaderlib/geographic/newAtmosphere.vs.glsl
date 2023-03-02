// 假设POSITION是大气层外包围cube的坐标
// position from radii to -radii
attribute vec4 POSITION; 
uniform mat4 u_MvpMat;
varying vec3 v_OuterPosWC; // Atmosphere position on cube in world coordinate 

void main()
{
    // 通过大气层厚度来扩展cube的顶点
    // POSITION.x = sign(POSITION.x) * (abs(POSITION.x) + u_AtmosphereHeight);
    // POSITION.y = sign(POSITION.y) * (abs(POSITION.y) + u_AtmosphereHeight);
    // POSITION.z = sign(POSITION.z) * (abs(POSITION.z) + u_AtmosphereHeight);

    v_OuterPosWC = POSITION.xyz;
    gl_Position = u_MvpMat * POSITION;
}