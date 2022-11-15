#include <common>
#include <log_depth_vert>

attribute vec4 POSITION;
attribute vec2 TEXCOORD_0;

uniform mat4 u_MvpMat;

varying vec2 v_Textcoord;

void main() {
  vec4 position = geoCoordTranMat * POSITION;
  gl_Position = modelToClipCoordinates(position, u_MvpMat, true, 1.0, u_Far);
  v_Textcoord = TEXCOORD_0;
}