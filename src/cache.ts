export class Cache {
  private _canvasMap = new Map<string, HTMLCanvasElement>();
  private _size: number;

  constructor(size?: number) {
    this._size = size ?? 0;
  }

  set(key: string, canvas: HTMLCanvasElement) {
    this._canvasMap.set(key, copyCanvas(canvas));
  }

  get(key: string): HTMLCanvasElement | undefined {
    const c = this._canvasMap.get(key);
    return c ? copyCanvas(c) : undefined;
  }

  clear() {
    this._canvasMap.clear();
  }

  purge(key: string) {
    this._canvasMap.delete(key);
  }

  key(x: number, y: number, z: number): string {
    return `${x}/${y}/${z}`;
  }
}

function copyCanvas(canvas: HTMLCanvasElement) {
  const canvas2 = canvas.ownerDocument.createElement("canvas");
  canvas2.width = canvas.width;
  canvas2.height = canvas.height;
  const ctx = canvas2.getContext("2d");
  ctx?.drawImage(canvas, 0, 0);
  return canvas2;
}
