import { useEffect } from 'react';
import { Engine, ElevationLayer, HeatMapLayer, HeatPoint } from 'terranova';

function Cases() {
  useEffect(() => {
    const tileCase = new Engine('tile');
    tileCase.run();

    const terrain = new Engine('terrain');
    const elevationLayer = new ElevationLayer(terrain, {
      exaggerationFactor: 100,
    });
    terrain.scene.addLayer(elevationLayer);
    terrain.run();

    const heatmap = new Engine('heatmap');
    const heatLayer = new HeatMapLayer(heatmap, {
      radius: 10,
      tileSize: 256,
      gradient: ['00AAFF', '00FF00', 'FFFF00', 'FF8800', 'FF0000'],
      maxHeat: 20,
    });
    const heatPoints: HeatPoint[] = [];

    fetch('http://121.199.160.202:9999/query?tag=89')
      .then((res) => res.json())
      .then(({ data }) => {
        for (let point of data) {
          heatPoints.push({
            lat: point.lat,
            lng: point.lng,
            heat: point.heat,
          });
        }
        heatLayer.addPoints(heatPoints);
        heatmap.scene.addLayer(heatLayer);
        heatmap.run();
      });
  }, []);

  return (
    <div className="cases">
      <h2>案例</h2>
      <div className="container">
        <div className="case case1">
          <canvas id="tile"></canvas>
          <p>
            引擎目前支持所有按照TMS规范切分的瓦片地图的渲染，引擎基于光线追踪提出了中心扩散法来判断可见瓦片，对某一视角下的瓦片结合仅加载可见的瓦片，极大减少了网络资源消耗。
          </p>
        </div>
        <div className="case case2">
          <p>全球地形渲染，采用ESRI提供的LERC光栅瓦片。提供一系列配置参数，对全球地形夸大100的效果如右图所示。</p>
          <canvas id="terrain"></canvas>
        </div>
        <div className="case case3">
          <canvas id="heatmap"></canvas>
          <p>借助Wasm文件实现热力分析，获得比JS更高的性能优势。</p>
        </div>
      </div>
    </div>
  );
}

export default Cases;
