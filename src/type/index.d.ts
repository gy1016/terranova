/**
 * Multiple items in the configuration item, only one of them is required. Example:
 * type ImageMaterialOptions = RequireOnlyOne<Options, "base64" | "url">;
 */
export type RequireOnlyOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Record<Exclude<Keys, K>, undefined>>;
  }[Keys];
