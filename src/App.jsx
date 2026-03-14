// src/App.jsx
import React, { useState, useCallback, useRef, useEffect } from "react";

import TopSection from "./components/layout/TopSection";
import LowerLayer from "./components/layout/LowerLayer";
import { exportToSTL } from "./utils/stlExport";

// ─────────────────────────────────────────────────────────────
// PERSISTENCE
// scadCode is saved to localStorage on every change.
// On refresh: code is restored to editor AND preview auto-renders.
// ─────────────────────────────────────────────────────────────
const STORAGE_KEY = "scad-editor-code";

function getSavedCode() {
  try { return localStorage.getItem(STORAGE_KEY) ?? ""; }
  catch { return ""; }
}

function saveCode(code) {
  try { localStorage.setItem(STORAGE_KEY, code); }
  catch { /* storage full or blocked — fail silently */ }
}

function App() {

  // ── State ──────────────────────────────────────────────────
  const savedCode = getSavedCode();
  const [scadCode,   setScadCodeRaw] = useState(savedCode);
  const [urlInput,   setUrlInput]    = useState("");
  const [lastUrl,    setLastUrl]     = useState("");
  const [logs,       setLogs]        = useState([]);
  const [isLoading,  setIsLoading]   = useState(false);          // FIX 1: loading state
  // If code was saved, start at 1 so preview auto-renders on load
  const [runTrigger, setRunTrigger]  = useState(savedCode.trim() ? 1 : 0);

  // ── Refs ───────────────────────────────────────────────────
  const fetchController  = useRef(null);
  const previewObjectRef = useRef(null);

  // ── Persist every scadCode change to localStorage ─────────
  const setScadCode = useCallback((code) => {
    setScadCodeRaw(code);
    saveCode(code);
  }, []);

  // ─────────────────────────────────────────────────────────
  // LOGGING
  // ─────────────────────────────────────────────────────────
  const addLog = useCallback((type, message) => {
    if (!message) return;
    setLogs((prev) => [
      ...prev.slice(-99),
      { type, message, time: new Date().toLocaleTimeString() },
    ]);
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  const setError = useCallback((msg) => {
    if (msg) addLog("error", msg);
  }, [addLog]);

  const handleObjectReady = useCallback((obj) => {
    previewObjectRef.current = obj;
  }, []);

  // Log on restore so user knows code was reloaded
  useEffect(() => {
    if (savedCode.trim()) {
      addLog("info", "Editor restored from last session — press Run to re-render");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // once on mount only

  // ─────────────────────────────────────────────────────────
  // HANDLE RUN
  // ─────────────────────────────────────────────────────────
  const handleRun = useCallback(async () => {
    if (isLoading) return;           // FIX 1: prevent double-click
    setIsLoading(true);              // FIX 1: start loading
    addLog("info", "▶ Run triggered");

    if (fetchController.current) fetchController.current.abort();
    fetchController.current = new AbortController();

    try {
      let codeToRender = scadCode;

      // Fetch from URL whenever a URL is present — always fetch on Run
      if (urlInput?.trim()) {

        // Auto-convert GitHub blob URL → raw URL
        let resolvedUrl = urlInput.trim();
        // Strip line anchors like #L5 or #L5-L10
        resolvedUrl = resolvedUrl.split("#")[0];
        if (resolvedUrl.includes("github.com") && resolvedUrl.includes("/blob/")) {
          resolvedUrl = resolvedUrl
            .replace("github.com", "raw.githubusercontent.com")
            .replace("/blob/", "/");
          addLog("info", `Auto-converted to raw URL`);
        }

        addLog("info", `Fetching: ${resolvedUrl}`);

        // Try direct fetch first, fall back to CORS proxy if blocked
        let codeText = null;
        const directUrl = resolvedUrl;
        const proxyUrl  = `https://corsproxy.io/?${encodeURIComponent(directUrl)}`;

        for (const url of [directUrl, proxyUrl]) {
          try {
            addLog("info", `Trying: ${url.slice(0, 60)}...`);
            const res = await fetch(url, { signal: fetchController.current.signal });
            addLog("info", `Response: ${res.status} ${res.statusText}`);
            if (res.ok) {
              codeText = await res.text();
              addLog("info", `Got ${codeText.length} bytes`);
              break;
            }
          } catch (e) {
            if (e.name === "AbortError") throw e; // re-throw abort
            addLog("warning", `Failed: ${e.message}`);
          }
        }

        if (!codeText) throw new Error("Could not fetch file — check the URL and try again");

        // FIX 2: Validate — reject HTML pages or non-SCAD content
        const trimmed = codeText.trim();
        const looksLikeHtml = trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html");
        const looksLikeScad = /\b(cube|sphere|cylinder|translate|rotate|union|difference|module|color|linear_extrude)\b/.test(trimmed);
        if (looksLikeHtml) throw new Error("URL returned an HTML page — use the raw file URL");
        if (!looksLikeScad) addLog("warning", "File loaded but may not be valid SCAD — check the editor");

        codeToRender = codeText;
        setScadCode(codeToRender);   // show fetched code in editor
        setLastUrl(directUrl);
        setUrlInput("");             // clear URL — next Run uses editor code
        addLog("success", "SCAD file loaded from URL");
      }

      if (!codeToRender?.trim()) {
        addLog("warning", "Editor is empty — nothing to render");
        return;
      }

      setRunTrigger((prev) => prev + 1);

    } catch (err) {
      if (err.name === "AbortError") {
        addLog("warning", "Fetch cancelled — new run started");
        return;
      }
      addLog("error", `Run failed: ${err.message}`);
      console.error("[App.handleRun]", err);
    } finally {
      setIsLoading(false);           // FIX 1: always reset loading
    }
  }, [isLoading, scadCode, urlInput, lastUrl, addLog, setScadCode]);

  // ─────────────────────────────────────────────────────────
  // LOAD LOCAL FILE
  // ─────────────────────────────────────────────────────────
  const loadFromFile = useCallback((file) => {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target.result;

      if (!content?.trim()) {
        addLog("warning", `"${file.name}" is empty`);
        return;
      }

      setScadCode(content);
      setUrlInput("");
      setLastUrl("");
      addLog("success", `File loaded: ${file.name}`);
      setRunTrigger((prev) => prev + 1);
    };

    reader.onerror = () => addLog("error", `Failed to read: ${file.name}`);
    reader.readAsText(file);
  }, [addLog, setScadCode]);

  // ─────────────────────────────────────────────────────────
  // DOWNLOAD
  // ─────────────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    if (!scadCode?.trim()) {
      addLog("warning", "Nothing to download — editor is empty");
      return;
    }

    try {
      const blob    = new Blob([scadCode], { type: "text/plain" });
      const blobUrl = URL.createObjectURL(blob);
      const link    = document.createElement("a");
      link.href     = blobUrl;
      link.download = "model.scad";
      link.click();
      URL.revokeObjectURL(blobUrl);
      addLog("success", "model.scad downloaded");

      if (previewObjectRef.current) {
        exportToSTL(previewObjectRef.current, "model.stl");
        addLog("success", "model.stl exported");
      } else {
        addLog("info", "STL skipped — render a model first");
      }
    } catch (err) {
      addLog("error", `Download failed: ${err.message}`);
    }
  }, [scadCode, addLog]);

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className="h-screen w-full bg-[#0E0E0E] text-white flex flex-col overflow-hidden">

      {/* Desktop */}
      <div className="hidden md:flex md:flex-col h-full w-full">

        <div className="shrink-0">
          <TopSection
            urlInput={urlInput}
            setUrlInput={setUrlInput}
            onRun={handleRun}
            isLoading={isLoading}
            onLoadFile={loadFromFile}
            onDownload={handleDownload}
          />
        </div>

        <div className="flex-1 overflow-hidden">
          <LowerLayer
            scadCode={scadCode}
            setScadCode={setScadCode}
            runTrigger={runTrigger}
            setError={setError}
            logs={logs}
            addLog={addLog}
            clearLogs={clearLogs}
            onObjectReady={handleObjectReady}
          />
        </div>

      </div>

      {/* Mobile fallback */}
      <div className="flex h-screen items-center justify-center md:hidden">
        <p className="text-center px-6 text-gray-400 text-sm leading-relaxed">
          This IDE works best on desktop.<br />
          Please open on a larger screen.
        </p>
      </div>

    </div>
  );
}

export default App;
