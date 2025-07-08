import * as d3 from "d3";
type DrawPathParams<T extends number[] | Record<string, number>> = {
  data: T[];
  xField: T extends number[] ? number : keyof T;
  yField: T extends number[] ? number : keyof T;
  color: string;
  thickness: number;
};

type RenderToParams = {
  context: CanvasRenderingContext2D;
  viewportX: number;
  viewportY: number;
  viewportWidth: number;
  viewportHeight: number;
};

export class VirtualCanvas {
  private width: number;
  private height: number;
  private tileSize: number;
  private cols: number;
  private rows: number;
  private tiles: {
    canvas: OffscreenCanvas;
    ctx: OffscreenCanvasRenderingContext2D;
    x: number;
    y: number;
    width: number;
    height: number;
  }[][];

  constructor(width: number, height: number, tileSize: number = 4096) {
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

  drawPath<T extends number[] | Record<string, number>>({
    data,
    xField,
    yField,
    color,
    thickness,
  }: DrawPathParams<T>) {
    const lineFn = d3
      .line<T>()
      .x((d) => d[xField as keyof T] as number)
      .y((d) => d[yField as keyof T] as number)
      .curve(d3.curveLinear);
    const chunks = data.reduce((acc, item) => {
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

    chunks.forEach((value, key) => {
      const [y, x] = key.split(",").map(Number);
      const tile = this.tiles[y][x];
      const path = new Path2D(lineFn(value) ?? undefined);
      tile.ctx.strokeStyle = color;
      tile.ctx.lineWidth = thickness;
      tile.ctx.stroke(path);
    });
  }

  draw(
    callback: (
      ctx: OffscreenCanvasRenderingContext2D,
      rowIndex: number,
      colIndex: number
    ) => void
  ) {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const tile = this.tiles[y][x];
        tile.ctx.save();

        tile.ctx.clearRect(0, 0, tile.width, tile.height);

        callback(tile.ctx, y, x);
        tile.ctx.restore();
      }
    }
  }

  renderTo({
    context,
    viewportX,
    viewportY,
    viewportWidth,
    viewportHeight,
  }: RenderToParams) {
    context.clearRect(0, 0, viewportWidth, viewportHeight);

    const startX = Math.max(0, Math.floor(viewportX / this.tileSize));
    const startY = Math.max(0, Math.floor(viewportY / this.tileSize));
    const endX = Math.min(
      this.cols - 1,
      Math.floor((viewportX + viewportWidth) / this.tileSize)
    );
    const endY = Math.min(
      this.rows - 1,
      Math.floor((viewportY + viewportHeight) / this.tileSize)
    );

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        const tile = this.tiles[y][x];

        const sourceX = Math.max(0, viewportX - tile.x);
        const sourceY = Math.max(0, viewportY - tile.y);
        const sourceWidth = Math.min(
          tile.width - sourceX,
          viewportWidth - (tile.x + sourceX - viewportX)
        );
        const sourceHeight = Math.min(
          tile.height - sourceY,
          viewportHeight - (tile.y + sourceY - viewportY)
        );

        if (sourceWidth <= 0 || sourceHeight <= 0) continue;

        const destX = tile.x + sourceX - viewportX;
        const destY = tile.y + sourceY - viewportY;

        context.drawImage(
          tile.canvas,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          destX,
          destY,
          sourceWidth,
          sourceHeight
        );
      }
    }
  }

  clear() {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const tile = this.tiles[y][x];
        tile.ctx.clearRect(0, 0, tile.width, tile.height);
      }
    }
  }

  download(
    filename: string = "canvas",
    quality: number = 1,
    type: string = "image/png"
  ) {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = this.width;
    tempCanvas.height = this.height;
    const tempCtx = tempCanvas.getContext("2d");

    if (!tempCtx) {
      console.error("Could not create temporary canvas context");
      return;
    }

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const tile = this.tiles[y][x];
        tempCtx.drawImage(
          tile.canvas,
          0,
          0,
          tile.width,
          tile.height,
          tile.x,
          tile.y,
          tile.width,
          tile.height
        );
      }
    }

    const link = document.createElement("a");
    link.download = `${filename}.${type === "image/png" ? "png" : "jpg"}`;
    link.href = tempCanvas.toDataURL(type, quality);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
