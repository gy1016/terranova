// 假设POSITION是大气层外包围cube的坐标
// position from radii to -radii
attribute vec4 POSITION; 
uniform mat4 u_MvpMat;
varying vec3 v_OuterPosWC; // Atmosphere position on cube in world coordinate 

void main()
{
    v_OuterPosWC = POSITION.xyz;
    gl_Position = u_MvpMat * POSITION;
}