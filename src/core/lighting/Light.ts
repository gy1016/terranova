import { Transform } from "../Transform";

export class Light {
  /** Light source position. */
  transform: Transform;

  constructor() {
    this.transform = new Transform(this);
  }
}
