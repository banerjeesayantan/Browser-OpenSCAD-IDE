// src/components/layout/LowerLayer.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";

import EditorPanel from "../editor/EditorPanel";
import PreviewPanel from "../preview/PreviewPanel";
import TerminalPanel from "../terminal/TerminalPanel";

export default function LowerLayer({
  scadCode,
  setScadCode,
  runTrigger,
  setError,
  logs,
  addLog,
  clearLogs,
  onObjectReady,
}) {
  const containerRef = useRef(null);

  // Real pixel dimensions of the container — updated by ResizeObserver
  const [containerW, setContainerW] = useState(0);
  const [containerH, setContainerH] = useState(0);

  // Panel split state — as fractions so they scale on window resize
  const [leftFraction,    setLeftFraction]    = useState(0.45);
  const [previewFraction, setPreviewFraction] = useState(0.65);

  // Measure container on mount and every time it resizes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      setContainerW(el.offsetWidth);
      setContainerH(el.offsetHeight);
    };

    measure(); // initial measurement

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Derive pixel sizes from fractions — always in sync with container
  const leftW    = Math.round(containerW * leftFraction);
  const previewH = Math.round(containerH * previewFraction);

  const handleLeftResize = useCallback((_, { size }) => {
    if (containerW > 0) setLeftFraction(size.width / containerW);
  }, [containerW]);

  const handlePreviewResize = useCallback((_, { size }) => {
    if (containerH > 0) setPreviewFraction(size.height / containerH);
  }, [containerH]);

  // Don't render panels until we have real dimensions
  if (containerW === 0 || containerH === 0) {
    return <div ref={containerRef} className="h-full w-full flex overflow-hidden" />;
  }

  return (
    <div ref={containerRef} className="h-full w-full flex overflow-hidden">

      {/* LEFT: EDITOR */}
      <ResizableBox
        width={leftW}
        height={containerH}
        axis="x"
        minConstraints={[250, containerH]}
        maxConstraints={[Math.round(containerW * 0.75), containerH]}
        resizeHandles={["e"]}
        onResize={handleLeftResize}
        className="bg-[#111] border-r border-[#1A1A1A] shrink-0"
        style={{ height: containerH }}
      >
        <div style={{ width: leftW, height: containerH }} className="overflow-hidden">
          <EditorPanel
            value={scadCode}
            onCodeChange={setScadCode}
          />
        </div>
      </ResizableBox>

      {/* RIGHT: PREVIEW + TERMINAL */}
      <div
        className="flex flex-col overflow-hidden"
        style={{ width: containerW - leftW, height: containerH }}
      >
        {/* PREVIEW */}
        <ResizableBox
          width={containerW - leftW}
          height={previewH}
          axis="y"
          minConstraints={[containerW - leftW, 120]}
          maxConstraints={[containerW - leftW, Math.round(containerH * 0.85)]}
          resizeHandles={["s"]}
          onResize={handlePreviewResize}
          style={{ width: "100%" }}
        >
          <div style={{ width: "100%", height: previewH }} className="overflow-hidden">
            <PreviewPanel
              scadCode={scadCode}
              runTrigger={runTrigger}
              onError={setError}
              addLog={addLog}
              onObjectReady={onObjectReady}
            />
          </div>
        </ResizableBox>

        {/* TERMINAL */}
        <div
          className="bg-[#1A1A1A] overflow-hidden"
          style={{ height: containerH - previewH }}
        >
          <TerminalPanel logs={logs} onClear={clearLogs} />
        </div>
      </div>

    </div>
  );
}

// // src/components/layout/LowerLayer.jsx
// import React, { useState, useEffect, useRef } from "react";
// import { ResizableBox } from "react-resizable";
// import "react-resizable/css/styles.css";

// import EditorPanel from "../editor/EditorPanel";
// import PreviewPanel from "../preview/PreviewPanel";
// import TerminalPanel from "../terminal/TerminalPanel";

// export default function LowerLayer({
//   scadCode,
//   setScadCode,
//   runTrigger,
//   setError,
//   logs,
//   addLog,
//   clearLogs,
//   onObjectReady,
// }) {
//   const containerRef = useRef(null);

//   const [screenWidth, setScreenWidth] = useState(window.innerWidth);
//   const [screenHeight, setScreenHeight] = useState(window.innerHeight);
//   const [leftWidth, setLeftWidth] = useState(window.innerWidth * 0.5);
//   const [previewHeight, setPreviewHeight] = useState(window.innerHeight * 0.6);

//   useEffect(() => {
//     const handleResize = () => {
//       setScreenWidth(window.innerWidth);
//       setScreenHeight(window.innerHeight);
//     };
//     window.addEventListener("resize", handleResize);
//     return () => window.removeEventListener("resize", handleResize);
//   }, []);

//   const handleLeftResizeStop = (e, data) => setLeftWidth(data.size.width);
//   const handlePreviewResizeStop = (e, data) =>
//     setPreviewHeight(data.size.height);

//   return (
//     <div ref={containerRef} className="h-full w-full flex overflow-hidden">
//       {/* LEFT: EDITOR PANEL */}
//       <ResizableBox
//         width={leftWidth}
//         height={Infinity}
//         axis="x"
//         minConstraints={[300, 0]}
//         maxConstraints={[screenWidth * 0.7, 0]}
//         resizeHandles={["e"]}
//         onResizeStop={handleLeftResizeStop}
//         className="bg-[#111] border-r border-[#1A1A1A]"
//       >
//         <div className="h-full w-full overflow-auto">
//           <EditorPanel value={scadCode} onCodeChange={setScadCode} />
//         </div>
//       </ResizableBox>

//       {/* RIGHT: PREVIEW + TERMINAL */}
//       <div className="flex flex-col flex-1 min-w-50">
//         {/* PREVIEW PANEL */}
//         <ResizableBox
//           width={Infinity}
//           height={previewHeight}
//           axis="y"
//           minConstraints={[0, 150]}
//           maxConstraints={[0, screenHeight * 0.8]}
//           resizeHandles={["s"]}
//           onResizeStop={handlePreviewResizeStop}
//           className="bg-[#151515]"
//         >
//           <div className="h-full w-full overflow-hidden">
//             <PreviewPanel
//               scadCode={scadCode} /* real-time updates          */
//               runTrigger={runTrigger} /* manual run trigger         */
//               onError={setError}
//               addLog={addLog}
//               onObjectReady={onObjectReady} /* wires STL export to App    */
//             />
//           </div>
//         </ResizableBox>

//         {/* TERMINAL PANEL */}
//         <div className="flex-1 min-h-0 bg-[#1A1A1A] overflow-auto">
//           <TerminalPanel logs={logs} onClear={clearLogs} />
//         </div>
//       </div>
//     </div>
//   );
// }
