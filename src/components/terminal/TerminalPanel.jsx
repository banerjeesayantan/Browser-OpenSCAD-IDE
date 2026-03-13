// src/components/terminal/TerminalPanel.jsx
import React, { useEffect, useRef } from "react";

const TerminalPanel = ({ logs = [], onClear }) => {
  const containerRef = useRef(null);

  // ------------------------------
  // Auto-scroll to bottom safely
  // ------------------------------
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Use requestAnimationFrame to wait for DOM update
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [logs]);

  // ------------------------------
  // Map log type → Tailwind color
  // ------------------------------
  const getColorClass = (type) => {
    switch (type) {
      case "error":
        return "text-red-400";
      case "warning":
        return "text-yellow-400";
      case "success":
        return "text-green-400";
      case "info":
      default:
        return "text-gray-300";
    }
  };

  return (
    <div className="h-full w-full bg-[#0D0D0D] text-sm font-mono text-white flex flex-col">
      
      {/* Header */}
      <div className="flex justify-between items-center px-3 py-2 border-b border-[#222]">
        <span className="text-gray-400 font-semibold">Terminal</span>
        <button
          onClick={() => onClear?.()}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Log Output */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-3 space-y-1"
      >
        {logs.length === 0 ? (
          <div className="text-green-400 select-none">✔ Ready. Press Run to render.</div>
        ) : (
          logs.map((log, i) => (
            <div key={`${log.type}-${i}`} className="flex gap-2 select-text break-word">
              <span className="text-gray-500 min-w-15">{log.time}</span>
              <span className={getColorClass(log.type)}>{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TerminalPanel;