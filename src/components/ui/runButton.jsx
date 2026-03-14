// src/components/ui/runButton.jsx
import React from "react";
import { Button } from "@/components/ui/button";
import { Play, Loader2 } from "lucide-react";

const RunButton = ({ onRun, isLoading }) => {
  const handleRun = () => {
    if (typeof onRun === "function") {
      onRun();
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-[#0E0E0E] rounded-md">
      <Button
        onClick={handleRun}
        disabled={isLoading}
        className="
          flex items-center gap-2
          bg-blue-600
          border border-transparent
          text-white
          px-4 py-2
          hover:bg-blue-700
          hover:border-gray-500
          transition-all duration-200
          disabled:opacity-70
          disabled:cursor-not-allowed
        "
      >
        {isLoading
          ? <Loader2 size={18} className="animate-spin" />
          : <Play size={18} className="transition-colors duration-200" />
        }
        {isLoading ? "Running..." : "Run"}
      </Button>
    </div>
  );
};

export default RunButton;


