import {VCCore} from './core';

type DrawPathParams<T extends number[] | Record<string, number>> = {
  data: T[];
  xField: T extends number[] ? number : keyof T;
  yField: T extends number[] ? number : keyof T;
  callback: (params: {
    value: T[];
    ctx: OffscreenCanvasRenderingContext2D;
    colIndex: number;
    rowIndex: number;
  }) => void;
};

type RenderToParams = {
  context: CanvasRenderingContext2D;
  viewportX: number;
  viewportY: number;
  viewportWidth: number;
  viewportHeight: number;
};

export class VirtualCanvas extends VCCore {
  constructor(width: number, height: number, tileSize: number = 4096) {
    super(width, height, tileSize);
  }

  /**
   * parses data to chunks for specific overlay canvas and applies callback for each chunk
   * normalized value, actual ctx and row/col index are params passed to callback
   * */
  drawPath<T extends number[] | Record<string, number>>({
    data,
    xField,
    yField,
    callback,
  }: DrawPathParams<T>) {
    const chunks = this.getPathDataChunks({data, xField, yField});

    chunks.forEach((value, key) => {
      const [rowIndex, colIndex] = key.split(',').map(Number);
      const tile = this.tiles[rowIndex][colIndex];
      callback({value, ctx: tile.ctx, rowIndex, colIndex});
    });
  }

  drawForEach(
    callback: (params: {
      ctx: OffscreenCanvasRenderingContext2D;
      rowIndex: number;
      colIndex: number;
    }) => void
  ) {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const tile = this.tiles[y][x];

        callback({ctx: tile.ctx, rowIndex: y, colIndex: x});
      }
    }
  }

  renderTo({context, viewportX, viewportY, viewportWidth, viewportHeight}: RenderToParams) {
    context.clearRect(0, 0, viewportWidth, viewportHeight);

    const startX = Math.max(0, Math.floor(viewportX / this.tileSize));
    const startY = Math.max(0, Math.floor(viewportY / this.tileSize));
    const endX = Math.min(this.cols - 1, Math.floor((viewportX + viewportWidth) / this.tileSize));
    const endY = Math.min(this.rows - 1, Math.floor((viewportY + viewportHeight) / this.tileSize));

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

  download(filename: string = 'canvas', quality: number = 1, type: string = 'image/png') {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.width;
    tempCanvas.height = this.height;
    const tempCtx = tempCanvas.getContext('2d');

    if (!tempCtx) {
      console.error('Could not create temporary canvas context');
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

    const link = document.createElement('a');
    link.download = `${filename}.${type === 'image/png' ? 'png' : 'jpg'}`;
    link.href = tempCanvas.toDataURL(type, quality);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
