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

  draw(callback: (ctx: OffscreenCanvasRenderingContext2D) => void) {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const tile = this.tiles[y][x];
        tile.ctx.save();
        tile.ctx.clearRect(0, 0, tile.width, tile.height);
        callback(tile.ctx);
        tile.ctx.restore();
      }
    }
  }

  renderTo(
    context: CanvasRenderingContext2D,
    viewportX: number,
    viewportY: number,
    viewportWidth: number,
    viewportHeight: number
  ) {
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
}
