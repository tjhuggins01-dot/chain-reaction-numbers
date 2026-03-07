export interface Rng {
  readonly seed: number;
  next(): number;
  nextFloat(): number;
}

export class SeededRng implements Rng {
  private state: number;

  constructor(public readonly seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state;
  }

  nextFloat(): number {
    return this.next() / 0x100000000;
  }
}
