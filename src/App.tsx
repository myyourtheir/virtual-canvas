import { useEffect, useRef } from "react";
import { VirtualCanvas } from "./VirtualCanvas";
import "./styles.css";

const VIEWPORT_WIDTH = 500;
const VIEWPORT_HEIGHT = 500;

export default function App() {
  const ref = useRef<HTMLCanvasElement>(null);
  const virtualCanvasRef = useRef(new VirtualCanvas(VIEWPORT_WIDTH, 10000));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const displayCanvas = ref.current;
    const virtualCanvas = virtualCanvasRef.current;
    if (!displayCanvas) return;
    const displayCtx = displayCanvas.getContext("2d");
    if (!displayCtx || !virtualCanvas || !container) return;
    const handleScroll = (e: Event) => {
      virtualCanvas.renderTo(
        displayCtx,
        container.scrollLeft,
        container.scrollTop,
        VIEWPORT_WIDTH,
        VIEWPORT_HEIGHT
      );
    };
    container.addEventListener("scroll", handleScroll);

    virtualCanvas.draw((ctx) => {
      ctx.fillStyle = "blue";
      ctx.fillRect(0, 0, 100, 600);

      ctx.fillStyle = "red";
      ctx.fillRect(150, 700, 200, 600);
    });

    if (!displayCtx) return;
    virtualCanvas.renderTo(displayCtx, 0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      virtualCanvas.clear();
    };
  }, []);

  return (
    <div className="App">
      <canvas
        ref={ref}
        width={VIEWPORT_WIDTH}
        height={VIEWPORT_HEIGHT}
        style={{ display: "inline" }}
      />
      <div className="container" ref={containerRef}>
        <div className="hugeElement" />
      </div>
    </div>
  );
}
