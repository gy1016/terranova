#include <common>

attribute vec4 POSITION;
attribute vec2 TEXCOORD_0;

uniform mat4 u_MvpMat;

varying vec2 v_Textcoord;

void main() {
  gl_Position = u_MvpMat * geoCoordTranMat * POSITION;
  v_Textcoord = TEXCOORD_0;
}