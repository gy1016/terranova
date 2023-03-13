struct Intersection {
  bool Intersects;
  float NearTime;
  float FarTime;
};

Intersection RayIntersectEllipsoid(vec3 rayOrigin, vec3 rayOriginSquared, vec3 rayDirection, vec3 oneOverEllipsoidRadiiSquared)
{
  float a = dot(rayDirection * rayDirection, oneOverEllipsoidRadiiSquared);
  float b = 2.0 * dot(rayOrigin * rayDirection, oneOverEllipsoidRadiiSquared);
  float c = dot(rayOriginSquared, oneOverEllipsoidRadiiSquared) - 1.0;
  float discriminant = b * b - 4.0 * a * c;

  if (discriminant < 0.0)
  {
      return Intersection(false, 0.0, 0.0);
  }
  else if (discriminant == 0.0)
  {
      float time = -0.5 * b / a;
      return Intersection(true, time, time);
  }

  float t = -0.5 * (b + (b > 0.0 ? 1.0 : -1.0) * sqrt(discriminant));
  float root1 = t / a;
  float root2 = c / t;

  return Intersection(true, min(root1, root2), max(root1, root2));
}
