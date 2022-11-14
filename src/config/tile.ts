export interface TileServiceMap {
  ArcGIS: string;
  Google: Array<string>;
}

export const TILE_SERVICE_MAP: TileServiceMap = {
  ArcGIS: "https://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineCommunity/MapServer/tile/level/row/col",
  Google: [
    "http://mt1.google.cn/vt/lyrs=s&hl=zh-CN&x=col&y=row&z=level&s=Gali",
    "http://mt2.google.cn/vt/lyrs=s&hl=zh-CN&x=col&y=row&z=level&s=Gali",
    "http://mt3.google.cn/vt/lyrs=s&hl=zh-CN&x=col&y=row&z=level&s=Gali",
    "http://mt4.google.cn/vt/lyrs=s&hl=zh-CN&x=col&y=row&z=level&s=Gali",
  ],
};
