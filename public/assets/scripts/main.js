import { Engine, ArcGISLayer, GoogleLayer, ElevationLayer, HeatMapLayer } from "../../index.js";

const toggleDiv = document.getElementById("toggle");
const toggleImg = document.getElementById("toggle-img");
const terrainDiv = document.getElementById("terrain");
const heatmapDiv = document.getElementById("heatmap");

let tileMode = "real",
  terrainShow = false,
  heatmapShow = false;

const terranova = new Engine("gy");
const scene = terranova.scene;
terranova.run();

toggleDiv.onclick = () => {
  tileMode = tileMode === "real" ? "street" : "real";
  scene.layers.pop();
  if (tileMode === "street") {
    toggleImg.src = "./assets/imgs/real.png";
    scene.layers.push(new ArcGISLayer(terranova, 2));
  } else {
    toggleImg.src = "./assets/imgs/street.png";
    scene.layers.push(new GoogleLayer(terranova, 2));
  }
};

terrainDiv.onclick = () => {
  terrainShow = !terrainShow;
  if (terrainShow) {
    const elevationLayer = new ElevationLayer(terranova, {
      exaggerationFactor: 30,
    });
    scene.addLayer(elevationLayer);
  } else {
    const layers = scene.layers;
    scene.layers = layers.filter((layer) => !(layer instanceof ElevationLayer));
  }
};

heatmapDiv.onclick = () => {
  heatmapShow = !heatmapShow;
  if (heatmapShow) {
    const heatPoints = [];
    const heatLayer = new HeatMapLayer(terranova, {
      radius: 10,
      tileSize: 256,
      gradient: ["00AAFF", "00FF00", "FFFF00", "FF8800", "FF0000"],
      maxHeat: 20,
      mode: "wasm",
    });
    fetch("http://121.199.160.202:9999/query?tag=89")
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
        scene.addLayer(heatLayer);
      });
  } else {
    const layers = scene.layers;
    scene.layers = layers.filter((layer) => !(layer instanceof HeatMapLayer));
  }
};
