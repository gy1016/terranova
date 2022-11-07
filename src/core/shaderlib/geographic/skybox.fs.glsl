precision mediump float;

uniform samplerCube u_Skybox;
uniform mat4 u_InvVPMat;
varying vec4 v_Position;

void main() {
  // 使用视图投影矩阵的逆来获取相机看向矩形每一个像素的方向。这会是看向立方体贴图的方向
  vec4 t = u_InvVPMat * v_Position;
  gl_FragColor = textureCube(u_Skybox, normalize(t.xyz / t.w));
}