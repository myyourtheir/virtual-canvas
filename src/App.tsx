import { useEffect, useRef } from "react";
import { VirtualCanvas } from "./VirtualCanvas";
import "./styles.css";
import { pathData } from "./pathData";

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
    pathData.forEach((data, i) => {
      virtualCanvas.drawPath({
        data,
        xField: 1,
        yField: 0,
        color: i % 2 === 0 ? "red" : "blue",
        thickness: 1,
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
