type GetPathDataChunksParams<T extends number[] | Record<string, number>> = {
  data: T[];
  xField: T extends number[] ? number : keyof T;
  yField: T extends number[] ? number : keyof T;
};

export class VCCore {
  protected width: number;
  protected height: number;
  protected tileSize: number;
  protected cols: number;
  protected rows: number;
  protected tiles: {
    canvas: OffscreenCanvas;
    ctx: OffscreenCanvasRenderingContext2D;
    x: number;
    y: number;
    width: number;
    height: number;
  }[][];

  constructor(width: number, height: number, tileSize: number) {
    this.width = width;
    this.height = height;
    this.tileSize = tileSize;

    this.cols = Math.ceil(width / tileSize);
    this.rows = Math.ceil(height / tileSize);

    this.tiles = [];
    for (let y = 0; y < this.rows; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < this.cols; x++) {
        const tileWidth = Math.min(tileSize, width - x * tileSize);
        const tileHeight = Math.min(tileSize, height - y * tileSize);

        const canvas = new OffscreenCanvas(tileWidth, tileHeight);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not get canvas context");

        this.tiles[y][x] = {
          canvas,
          ctx,
          x: x * tileSize,
          y: y * tileSize,
          width: tileWidth,
          height: tileHeight,
        };
      }
    }
  }

  getContextAt(x: number, y: number) {
    const tileX = Math.floor(x / this.tileSize);
    const tileY = Math.floor(y / this.tileSize);

    if (tileY >= 0 && tileY < this.rows && tileX >= 0 && tileX < this.cols) {
      const tile = this.tiles[tileY][tileX];
      return {
        ctx: tile.ctx,
        localX: x - tile.x,
        localY: y - tile.y,
      };
    }
    return null;
  }

  getPathDataChunks = <T extends number[] | Record<string, number>>({
    data,
    xField,
    yField,
  }: GetPathDataChunksParams<T>) => {
    return data.reduce((acc, item) => {
      const itemX = item[xField as keyof T] as number;
      const itemY = item[yField as keyof T] as number;
      const tileXIndex = Math.floor(itemX / this.tileSize);
      const tileYIndex = Math.floor(itemY / this.tileSize);
      const key = [tileYIndex, tileXIndex].join(",");
      const existingKeyValue = acc.get(key);

      let preparedItem: Record<string, number> | number[] = {
        [xField]: itemX - tileXIndex * this.tileSize,
        [yField]: itemY - tileYIndex * this.tileSize,
      };
      if (Array.isArray(item)) {
        preparedItem = Object.values(preparedItem);
      }

      if (!existingKeyValue) {
        return acc.set(key, [preparedItem as T]);
      }
      existingKeyValue.push(preparedItem as T);
      return acc;
    }, new Map<string, T[]>());
  };
}
