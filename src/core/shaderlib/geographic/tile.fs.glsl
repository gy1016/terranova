uniform sampler2D u_Sampler;
varying vec2 v_Textcoord;

void main() {
  gl_FragColor = texture2D(u_Sampler, v_Textcoord);
} 