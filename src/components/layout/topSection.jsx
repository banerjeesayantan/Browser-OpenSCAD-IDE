// src/components/layout/TopSection.jsx
import React, { useRef } from "react";
import Search from "../ui/Search";
import RunButton from "../ui/runButton";
import FileDownload from "../ui/fileDownload";

const TopSection = ({ urlInput, setUrlInput, onRun, onLoadFile, onDownload }) => {
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
        <RunButton onRun={onRun} />

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


// Old still Gold ⬇
// // src/components/layout/topSection.jsx
// import React, { useRef } from "react";
// import Search from "../ui/search";
// import RunButton from "../ui/runButton";
// import FileDownload from "../ui/fileDownload";

// const TopSection = ({ urlInput, setUrlInput, onRun, onLoadFile, onDownload }) => {
//   const fileInputRef = useRef(null);

//   // Handle SCAD file selection
//   const handleFileChange = (e) => {
//     const file = e.target.files[0];
//     if (!file) return;

//     // Pass file to parent handler
//     onLoadFile?.(file);

//     // Reset input so same file can be re-uploaded
//     e.target.value = "";
//   };

//   return (
//     <div className="sticky top-0 flex items-center justify-between h-20 w-full bg-[#0E0E0E] text-white px-6 border-b border-[#1A1A1A] z-50">
      
//       {/* Left Side: Search, Run, Upload */}
//       <div className="flex items-center gap-2">
//         <Search urlInput={urlInput} setUrlInput={setUrlInput} />
//         <RunButton onRun={onRun} />

//         {/* Hidden File Input */}
//         <input
//           type="file"
//           accept=".scad"
//           ref={fileInputRef}
//           onChange={handleFileChange}
//           className="hidden"
//         />

//         <button
//           onClick={() => fileInputRef.current.click()}
//           className="px-3 py-1 bg-[#222] hover:bg-[#333] transition-colors rounded text-sm"
//           aria-label="Upload SCAD file"
//         >
//           Upload
//         </button>
//       </div>

//       {/* Right Side: Download */}
//       <div className="flex items-center">
//         <FileDownload onDownload={onDownload} />
//       </div>
//     </div>
//   );
// };

// export default TopSection;