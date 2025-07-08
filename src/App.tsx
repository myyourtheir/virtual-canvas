import { useEffect, useRef } from "react";
import { VirtualCanvas } from "./VirtualCanvas";
import { pathData } from "./pathData";
import * as d3 from "d3";
import "./styles.css";

const VIEWPORT_WIDTH = 500;
const VIEWPORT_HEIGHT = 500;
const FULL_WIDTH = 500;
const FULL_HEIGHT = 2500;

export default function App() {
  const ref = useRef<HTMLCanvasElement>(null);
  const virtualCanvasRef = useRef(
    new VirtualCanvas(FULL_WIDTH, FULL_HEIGHT, 500)
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const displayCanvas = ref.current;
    const virtualCanvas = virtualCanvasRef.current;
    if (!displayCanvas) return;
    const displayCtx = displayCanvas.getContext("2d");
    if (!displayCtx || !virtualCanvas || !container) return;
    const handleScroll = (e: Event) => {
      virtualCanvas.renderTo({
        context: displayCtx,
        viewportX: container.scrollLeft,
        viewportY: container.scrollTop,
        viewportWidth: VIEWPORT_WIDTH,
        viewportHeight: VIEWPORT_HEIGHT,
      });
    };
    container.addEventListener("scroll", handleScroll);

    // virtualCanvas.draw((ctx) => {
    //   ctx.fillStyle = "blue";
    //   ctx.fillRect(0, 0, 50, 600);

    //   ctx.fillStyle = "red";
    //   ctx.fillRect(150, 700, 200, 600);
    // });
    const lineFn = d3
      .line<number[]>()
      .x((d) => d[1])
      .y((d) => d[0])
      .curve(d3.curveLinear);

    pathData.forEach((data, i) => {
      virtualCanvas.drawPath({
        data,
        xField: 1,
        yField: 0,
        callback: ({ ctx, value }) => {
          const path = new Path2D(lineFn(value) ?? undefined);
          ctx.strokeStyle = i % 2 === 0 ? "red" : "blue";
          ctx.lineWidth = 1;
          ctx.stroke(path);
        },
      });
    });
    if (!displayCtx) return;
    virtualCanvas.renderTo({
      context: displayCtx,
      viewportX: 0,
      viewportY: 0,
      viewportWidth: VIEWPORT_WIDTH,
      viewportHeight: VIEWPORT_HEIGHT,
    });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      virtualCanvas.clear();
    };
  }, []);

  return (
    <div className="App">
      <div className="wrapper">
        <canvas
          ref={ref}
          width={VIEWPORT_WIDTH}
          height={VIEWPORT_HEIGHT}
          style={{ display: "inline" }}
        />
        <div className="container" ref={containerRef}>
          <div
            style={{
              width: FULL_WIDTH,
              height: FULL_HEIGHT,
            }}
          />
        </div>
      </div>
      <button
        className="download"
        onClick={() => {
          virtualCanvasRef.current.download();
        }}
      >
        Download
      </button>
    </div>
  );
}
