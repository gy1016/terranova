uniform float u_Far;

vec4 modelToClipCoordinates(vec4 position, mat4 mvpMat, bool enable, float constant, float far)
{
  vec4 clip = mvpMat * position;
  if(enable)
  {
    clip.z = ((2.0 * log(constant * clip.z + 1.0) / log(constant * far + 1.0)) - 1.0) * clip.w;
  }
  return clip;
}
