attribute vec4 POSITION;
uniform mat4 u_MvpMat;
varying vec3 v_WorldPosition;

void main()
{
    gl_Position = u_MvpMat * POSITION;
    v_WorldPosition = POSITION.xyz;
}