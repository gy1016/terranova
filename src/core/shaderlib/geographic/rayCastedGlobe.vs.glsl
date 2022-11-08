
attribute vec4 POSITION;
uniform mat4 u_VPMat;
varying vec3 v_WorldPosition;

void main()
{
    gl_Position = u_VPMat * POSITION;
    v_WorldPosition = POSITION.xyz;
}