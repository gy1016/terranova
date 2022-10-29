attribute vec4 a_Position;
attribute vec2 a_Textcoord;
varying vec2 v_Textcoord;
uniform mat4 u_MvpMatrix;

void main() {
  gl_Position = u_MvpMatrix * a_Position;
  v_Textcoord = a_Textcoord;
}