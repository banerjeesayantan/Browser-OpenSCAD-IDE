// src/components/ui/Search.jsx
import { SearchIcon } from "lucide-react";

const Search = ({ urlInput, setUrlInput, onRun }) => {
  return (
    <div className="flex items-center gap-2 border border-gray-600 rounded-md px-3 py-1.5 bg-[#111] focus-within:border-blue-500 transition-colors min-w-95">
      <SearchIcon size={16} className="text-gray-400 shrink-0" />
      <input
        type="text"
        placeholder="Enter the URL of your .scad file"
        value={urlInput}
        onChange={(e) => setUrlInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") onRun?.(); }}
        className="bg-transparent outline-none text-sm text-white placeholder-gray-500 w-full"
      />
      {urlInput && (
        <button
          onClick={() => setUrlInput("")}
          className="text-gray-500 hover:text-white text-xs shrink-0"
        >✕</button>
      )}
    </div>
  );
};

export default Search;