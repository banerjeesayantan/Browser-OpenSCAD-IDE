// src/components/editor/EditorPanel.jsx
import React, { useEffect, useRef } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";

const EditorPanel = ({ value = "", onCodeChange }) => {
  const monaco = useMonaco();
  const editorRef = useRef(null);

  useEffect(() => {
    if (!monaco) return;
    const registered = monaco.languages.getLanguages().some(lang => lang.id === "scad");
    if (!registered) {
      try {
        monaco.languages.register({ id: "scad" });
        monaco.languages.setMonarchTokensProvider("scad", {
          tokenizer: {
            root: [
              [/\/\/.*/, "comment"],
              [/\/\*/, "comment", "@comment"],
              [/\b(cube|sphere|cylinder|translate|rotate|scale|union|difference|intersection|color|linear_extrude|rotate_extrude|circle|square|polygon|mirror|resize|hull|minkowski)\b/, "keyword"],
              [/\$fn|\$fa|\$fs/, "keyword"],
              [/\d+(\.\d+)?/, "number"],
              [/"([^"\\]|\\.)*"/, "string"],
            ],
            comment: [
              [/[^/*]+/, "comment"],
              [/\*\//, "comment", "@pop"],
              [/./, "comment"],
            ],
          },
        });
        monaco.editor.defineTheme("scad-dark", {
          base: "vs-dark",
          inherit: true,
          rules: [
            { token: "keyword", foreground: "ff7b72" },
            { token: "number", foreground: "79c0ff" },
            { token: "comment", foreground: "8b949e" },
            { token: "string", foreground: "a5d6ff" },
          ],
          colors: {
            "editor.background": "#111111",
            "minimap.background": "#0d0d0d",
          },
        });
      } catch (err) {
        console.error("Monaco SCAD setup failed:", err);
      }
    }
  }, [monaco]);

  const handleChange = (val) => {
    try {
      if (onCodeChange) onCodeChange(val ?? "");
    } catch (err) {
      console.error("EditorPanel onCodeChange failed:", err);
    }
  };

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };

  return (
    <div className="h-full w-full bg-[#111111] flex flex-col">

      {/* Header — matches TerminalPanel style exactly */}
      <div className="flex items-center px-3 py-1 border-b border-[#222] bg-[#1e1e1e] shrink-0">
        <span className="text-gray-400 font-semibold text-sm font-mono">Editor</span>
      </div>

      {/* Monaco fills remaining height */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language="scad"
          value={value ?? ""}
          theme="vs-dark"
          onChange={handleChange}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            tabSize: 2,
            readOnly: false,
            wordWrap: "on",
          }}
        />
      </div>

    </div>
  );
};

export default EditorPanel;

// // src/components/editor/EditorPanel.jsx
// import React, { useEffect, useRef } from "react";
// import Editor, { useMonaco } from "@monaco-editor/react";

// const EditorPanel = ({ value = "", onCodeChange }) => {
//   const monaco = useMonaco();
//   const editorRef = useRef(null);

//   // --------------------------
//   // Setup SCAD language and theme safely
//   // --------------------------
//   useEffect(() => {
//     if (!monaco) return;

//     const registered = monaco.languages.getLanguages().some(lang => lang.id === "scad");
//     if (!registered) {
//       try {
//         // Register SCAD language
//         monaco.languages.register({ id: "scad" });

//         // Monarch tokenizer
//         monaco.languages.setMonarchTokensProvider("scad", {
//           tokenizer: {
//             root: [
//               [/\/\/.*/, "comment"],
//               [/\/\*/, "comment", "@comment"],
//               [/\b(cube|sphere|cylinder|translate|rotate|scale|union|difference|intersection|color)\b/, "keyword"],
//               [/\d+(\.\d+)?/, "number"],
//               [/"([^"\\]|\\.)*"/, "string"],
//             ],
//             comment: [
//               [/[^/*]+/, "comment"],
//               [/\*\//, "comment", "@pop"],
//               [/./, "comment"],
//             ],
//           },
//         });

//         // Dark theme
//         monaco.editor.defineTheme("scad-dark", {
//           base: "vs-dark",
//           inherit: true,
//           rules: [
//             { token: "keyword", foreground: "ff7b72" },
//             { token: "number", foreground: "79c0ff" },
//             { token: "comment", foreground: "8b949e" },
//             { token: "string", foreground: "a5d6ff" },
//           ],
//           colors: {
//             "editor.background": "#111111",
//           },
//         });
//       } catch (err) {
//         console.error("Monaco SCAD setup failed:", err);
//       }
//     }
//   }, [monaco]);

//   // --------------------------
//   // Handle editor changes safely
//   // --------------------------
//   const handleChange = (val) => {
//     try {
//       if (onCodeChange) onCodeChange(val ?? "");
//     } catch (err) {
//       console.error("EditorPanel onCodeChange failed:", err);
//     }
//   };

//   // --------------------------
//   // Capture editor instance
//   // --------------------------
//   const handleEditorDidMount = (editor) => {
//     editorRef.current = editor;
//   };

//   return (
//     <div className="h-full w-full">
//       <span className="text-gray-400 font-semibold">Editor</span>
//       <Editor
//         height="100%"
//         language="scad"
//         value={value ?? ""}
//         theme="vs-dark"
//         onChange={handleChange}
//         onMount={handleEditorDidMount}
//         options={{
//           minimap: { enabled: true },
//           fontSize: 14,
//           automaticLayout: true,
//           scrollBeyondLastLine: false,
//           tabSize: 2,
//           readOnly: false,
//           wordWrap: "on",
//         }}
//       />
//     </div>
//   );
// };

// export default EditorPanel;