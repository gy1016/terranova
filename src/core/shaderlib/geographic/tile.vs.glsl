attribute vec4 POSITION;
attribute vec2 TEXCOORD_0;

varying vec2 v_Textcoord;
uniform mat4 u_MvpMatrix;

void main() {
  gl_Position = u_MvpMatrix * POSITION;
  v_Textcoord = TEXCOORD_0;
}