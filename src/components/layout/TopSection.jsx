// src/components/layout/TopSection.jsx
import React, { useRef } from "react";
import Search from "../ui/Search";
import RunButton from "../ui/RunButton";
import FileDownload from "../ui/FileDownload";

const TopSection = ({ urlInput, setUrlInput, onRun, isLoading, onLoadFile, onDownload }) => {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    onLoadFile?.(file);
    e.target.value = "";
  };

  return (
    <div className="sticky top-0 flex items-center justify-between h-20 w-full bg-[#0E0E0E] text-white px-6 border-b border-[#1A1A1A] z-50">

      {/* Left: Search + Run + Upload */}
      <div className="flex items-center gap-2">
        <Search urlInput={urlInput} setUrlInput={setUrlInput} onRun={onRun} />
        <RunButton onRun={onRun} isLoading={isLoading} />

        <input
          type="file"
          accept=".scad"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current.click()}
          className="px-3 py-1 bg-[#222] hover:bg-[#333] transition-colors rounded text-sm"
        >
          Upload
        </button>
      </div>

      {/* Right: Download */}
      <div className="flex items-center">
        <FileDownload onDownload={onDownload} />
      </div>

    </div>
  );
};

export default TopSection;










