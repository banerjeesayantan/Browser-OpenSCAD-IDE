import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const FileDownload = ({ onDownload }) => {
  const handleDownload = () => {
    if (typeof onDownload === "function") {
      onDownload();
    }
  };

  return (
    <div className="flex items-center gap-2 md:flex-row bg-[#0E0E0E]">
      <Button
        onClick={handleDownload}
        className="
          flex items-center gap-2
          bg-transparent
          border border-gray-500
          text-white
          hover:bg-gray-800
          hover:border-gray-600
          hover:text-white
          transition-all duration-200
        "
      >
        <Download size={18} />
        Download
      </Button>
    </div>
  );
};

export default FileDownload;