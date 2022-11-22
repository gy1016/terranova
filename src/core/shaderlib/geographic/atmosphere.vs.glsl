#include <log_depth_vert>

attribute vec4 POSITION;
attribute vec2 TEXCOORD_0;

uniform mat4 u_AtmoshpereMvpMat;

varying vec2 v_Textcoord;

void main() {
  gl_Position = modelToClipCoordinates(POSITION, u_AtmoshpereMvpMat, true, 1.0, u_Far);
  v_Textcoord = TEXCOORD_0;
}