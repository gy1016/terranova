import { useEffect } from 'react';
import { Engine, ElevationLayer, HeatMapLayer, HeatPoint } from 'terranova';

function Cases() {
  useEffect(() => {
    const terranova = new Engine('canvasId');
    terranova.run();
  }, []);

  return (
    <div className="cases">
      <h2>案例</h2>
      <div className="container">
        <div id="tilemap" className="switch"></div>
        <div id="terrain" className="switch"></div>
        <div id="heatmap" className="switch"></div>
        <canvas id="canvasId"></canvas>
      </div>
    </div>
  );
}

export default Cases;
