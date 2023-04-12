import { useEffect, useState } from 'react';
import { Engine, ElevationLayer, HeatMapLayer, HeatPoint, GoogleLayer, ArcGISLayer } from 'terranova';

let terranova: Engine;
let terrainShow = false;
let heatmapShow = false;

function Cases() {
  const [tileMode, setTileMde] = useState('real');

  const onTilemapClick = () => {
    let layers = terranova.scene.layers;
    if (tileMode === 'real') {
      setTileMde('street');
      layers = layers.filter((layer) => !(layer instanceof GoogleLayer));
      layers.push(new ArcGISLayer(terranova, 2));
    } else {
      setTileMde('real');
      layers = layers.filter((layer) => !(layer instanceof ArcGISLayer));
      layers.push(new GoogleLayer(terranova, 2));
    }
    terranova.scene.layers = layers;
  };

  const onTerrainClick = () => {
    terrainShow = !terrainShow;
    if (terrainShow) {
      const elevationLayer = new ElevationLayer(terranova, {
        exaggerationFactor: 50,
      });
      terranova.scene.addLayer(elevationLayer);
    } else {
      const layers = terranova.scene.layers;
      terranova.scene.layers = layers.filter((layer) => !(layer instanceof ElevationLayer));
    }
  };

  const onHeatmapClick = () => {
    heatmapShow = !heatmapShow;
    if (heatmapShow) {
      const heatPoints: HeatPoint[] = [];
      const heatLayer = new HeatMapLayer(terranova, {
        radius: 10,
        tileSize: 256,
        gradient: ['00AAFF', '00FF00', 'FFFF00', 'FF8800', 'FF0000'],
        maxHeat: 20,
        mode: 'wasm',
      });
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
          terranova.scene.addLayer(heatLayer);
        });
    } else {
      const layers = terranova.scene.layers;
      terranova.scene.layers = layers.filter((layer) => !(layer instanceof HeatMapLayer));
    }
  };

  useEffect(() => {
    terranova = new Engine('canvasId');
    terranova.run();
  }, []);

  return (
    <div className="cases">
      <h2>案例</h2>
      <div className="container">
        {/* TODO: 这里打包的时候估计会出错，先放着 */}
        <div
          id="tilemap"
          className="switch"
          onClick={onTilemapClick}
          style={{ backgroundImage: `url(src/assets/imgs/${tileMode == 'real' ? 'street' : 'real'}.png)` }}
        ></div>
        <div id="terrain" className="switch" onClick={onTerrainClick}></div>
        <div id="heatmap" className="switch" onClick={onHeatmapClick}></div>
        <canvas id="canvasId"></canvas>
      </div>
    </div>
  );
}

export default Cases;
