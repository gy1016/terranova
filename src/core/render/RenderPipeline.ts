import { Camera } from "../Camera";

export class RenderPipeline {
  private _camera: Camera;

  constructor(camera: Camera) {
    this._camera = camera;
  }

  render() {
    const engine = this._camera.engine;
    const scene = engine.scene;
    const renderer = engine._renderer;
    const canvas = engine.canvas;
    renderer.viewport(0, 0, canvas.width, canvas.height);

    scene._render();
  }
}
