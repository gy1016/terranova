attribute vec4 POSITION;
uniform mat4 u_MvpMat;
void main() {
  gl_Position = u_MvpMat * POSITION;
}