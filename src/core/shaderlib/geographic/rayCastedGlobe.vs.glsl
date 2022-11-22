#include <log_depth_vert>

attribute vec4 POSITION;
uniform mat4 u_MvpMat;
varying vec3 v_WorldPosition;

void main()
{
    gl_Position = modelToClipCoordinates(POSITION, u_MvpMat, true, 1.0, u_Far);
    v_WorldPosition = POSITION.xyz;
}