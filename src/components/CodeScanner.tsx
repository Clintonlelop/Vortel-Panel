import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Shield, Settings2, Code2, CheckCircle2, AlertCircle, RefreshCw, Terminal } from "lucide-react";
import { BotFile, Container } from "../types";

interface CodeScannerProps {
  container: Container;
  isInstalled: boolean;
  onAutoInstall: () => void;
  onSetStatus: (status: "OFFLINE" | "RUNNING" | "INSTALLING" | "CRASHED", errorText?: string) => void;
  addLog: (text: string, type?: "stdout" | "stderr" | "system" | "error" | "success" | "info") => void;
}

export default function CodeScanner({
  container,
  isInstalled,
  onAutoInstall,
  onSetStatus,
  addLog
}: CodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    language: string;
    entryFile: string;
    dependencies: string[];
    status: "clean" | "warning" | "error";
    message: string;
  } | null>(null);

  // Perform automatic scan whenever container files are changed
  useEffect(() => {
    autoScanFiles();
  }, [container.files, isInstalled]);

  const autoScanFiles = () => {
    const files = container.files;
    let language = "Vanilla Script";
    let entryFile = "index.js";
    let dependencies: string[] = [];
    let status: "clean" | "warning" | "error" = "clean";
    let message = "All systems operational.";

    // 1. Detect runtime language
    const hasPackageJson = files.some((f) => f.name === "package.json");
    const hasRequirementsTxt = files.some((f) => f.name === "requirements.txt");
    const hasMainPy = files.some((f) => f.name === "main.py") || files.some((f) => f.name.endsWith(".py"));
    const hasComposerJson = files.some((f) => f.name === "composer.json");

    if (hasPackageJson) {
      language = "Node.js (NPM Environment)";
      // Read package.json to get main entry point and dependencies
      const pkgFile = files.find((f) => f.name === "package.json");
      if (pkgFile) {
        try {
          const parsed = JSON.parse(pkgFile.content);
          entryFile = parsed.main || "index.js";
          if (parsed.dependencies) {
            dependencies = Object.keys(parsed.dependencies);
          }
        } catch (e) {
          status = "error";
          message = "package.json contains syntax or formatting errors.";
        }
      }
    } else if (hasRequirementsTxt || hasMainPy) {
      language = "Python Runtime";
      entryFile = files.some((f) => f.name === "main.py") ? "main.py" : files.find((f) => f.name.endsWith(".py"))?.name || "app.py";
      const reqFile = files.find((f) => f.name === "requirements.txt");
      if (reqFile) {
        dependencies = reqFile.content.split("\n").map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
      }
    } else if (hasComposerJson) {
      language = "PHP Daemon";
      entryFile = "index.php";
    }

    // 2. Perform static analysis on index.js or main entry point
    const mainFileObj = files.find((f) => f.name === entryFile);
    if (mainFileObj && status === "clean") {
      const code = mainFileObj.content;

      // Check for syntax errors like broken fs require
      if (code.includes("require('fs'{;")) {
        status = "error";
        message = `Syntax error detected in ${entryFile}: Invalid parameter parsing.`;
      } else if (code.includes("JSON.parse") && !files.some((f) => f.name === "config.json")) {
        status = "warning";
        message = `Missing configuration. index.js requires config.json which is not found in workspace.`;
      }
    }

    // Check if package.json lists broken dependencies
    const pkgFile = files.find((f) => f.name === "package.json");
    if (pkgFile && pkgFile.content.includes("broken-version-not-found-on-npm")) {
      status = "error";
      message = "Dependency tree contains unresolvable packages on npm.";
    }

    setScanResult({
      language,
      entryFile,
      dependencies,
      status,
      message
    });
  };

  const handleManualScan = () => {
    setIsScanning(true);
    addLog("[Vortex Engine] Initiating automated source security scan...", "info");
    
    setTimeout(() => {
      setIsScanning(false);
      autoScanFiles();
      if (scanResult) {
        if (scanResult.status === "error") {
          addLog(`[Vortex Engine] Scan Failed! ${scanResult.message}`, "error");
          onSetStatus("CRASHED", scanResult.message);
        } else if (scanResult.status === "warning") {
          addLog(`[Vortex Engine] Warning: ${scanResult.message}`, "error");
        } else {
          addLog(`[Vortex Engine] Source files verified! Runtime: ${scanResult.language}. Ready for run.`, "success");
        }
      }
    }, 1500);
  };

  if (!scanResult) return null;

  return (
    <div id="vortex-scanner-wrapper" className="rounded-2xl border border-white/5 bg-[#0e0e13]/85 p-5 space-y-4 shadow-xl backdrop-blur-md">
      
      {/* Title block */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <Shield className="text-purple-400" size={16} />
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-white">
              Vortex Code Scanner
            </h4>
            <span className="text-[8px] uppercase tracking-widest font-black text-gray-500 block">
              Automated Static File Analysis
            </span>
          </div>
        </div>

        <motion.button
          id="btn-trigger-vortex-scan"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleManualScan}
          disabled={isScanning}
          className="flex items-center gap-1.5 rounded-lg bg-purple-600/15 border border-purple-500/20 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-purple-400 hover:bg-purple-600 hover:text-white transition-all cursor-pointer"
        >
          <RefreshCw size={10} className={isScanning ? "animate-spin" : ""} />
          {isScanning ? "Scanning..." : "Scan Source Code"}
        </motion.button>
      </div>

      {/* Grid of parsed specs */}
      <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
        
        <div className="rounded-xl border border-white/5 bg-black/40 p-3.5 space-y-0.5">
          <span className="text-[8px] uppercase tracking-wider font-bold text-gray-500 block">Runtime Environment</span>
          <span className="text-xs font-bold text-white block">{scanResult.language}</span>
        </div>

        <div className="rounded-xl border border-white/5 bg-black/40 p-3.5 space-y-0.5">
          <span className="text-[8px] uppercase tracking-wider font-bold text-gray-500 block">Startup Entrypoint</span>
          <span className="text-xs font-bold text-purple-400 block">{scanResult.entryFile}</span>
        </div>

      </div>

      {/* Dependency Status */}
      <div className="rounded-xl border border-white/5 bg-black/30 p-3.5 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-[9px] uppercase tracking-widest font-black text-gray-400 font-mono">
            Dependencies ({scanResult.dependencies.length})
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${
            isInstalled 
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
              : "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse"
          }`}>
            {isInstalled ? "Dependencies Installed" : "NPM Install Required"}
          </span>
        </div>

        {scanResult.dependencies.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {scanResult.dependencies.map((dep) => (
              <span key={dep} className="rounded-md bg-white/2 border border-white/5 px-2 py-1 font-mono text-[10px] text-gray-300">
                {dep}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-[10px] text-gray-500 block font-mono">No external modules requested.</span>
        )}
      </div>

      {/* Scan Outcome */}
      <div className={`flex items-start gap-3 rounded-xl border p-4 ${
        scanResult.status === "error" 
          ? "border-rose-500/10 bg-rose-950/10 text-rose-300"
          : scanResult.status === "warning"
          ? "border-amber-500/10 bg-amber-950/10 text-amber-300"
          : "border-emerald-500/10 bg-emerald-950/10 text-emerald-300"
      }`}>
        {scanResult.status === "clean" ? (
          <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" size={16} />
        ) : (
          <AlertCircle className="text-rose-400 shrink-0 mt-0.5" size={16} />
        )}
        <div className="space-y-0.5">
          <span className="text-[9px] font-mono font-black uppercase tracking-widest block">
            SCAN STATUS: {scanResult.status.toUpperCase()}
          </span>
          <p className="text-xs font-semibold leading-relaxed">
            {scanResult.message}
          </p>
        </div>
      </div>

    </div>
  );
}
