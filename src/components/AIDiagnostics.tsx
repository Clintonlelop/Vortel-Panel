import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Sparkles,
  Bot,
  AlertTriangle,
  Play,
  CheckCircle,
  HelpCircle,
  RefreshCw,
  FileCode,
  Check,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import { BotFile, DiagnosticResult } from "../types";

interface AIDiagnosticsProps {
  logs: string;
  files: BotFile[];
  errorText: string;
  qwenKey: string;
  setFiles: React.Dispatch<React.SetStateAction<BotFile[]>>;
  onApplyFix: (fileName: string, fixedContent: string) => void;
  status: string;
}

export default function AIDiagnostics({
  logs,
  files,
  errorText,
  qwenKey,
  setFiles,
  onApplyFix,
  status
}: AIDiagnosticsProps) {
  const [loading, setLoading] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const [engineUsed, setEngineUsed] = useState("");

  const runDiagnostics = async () => {
    setLoading(true);
    setApiError(null);
    setApplied(false);
    setDiagnosticResult(null);

    // Map files array to key-value object (fileName -> content) for the API payload
    const filesPayload: Record<string, string> = {};
    files.forEach((f) => {
      if (!f.isFolder) {
        filesPayload[f.name] = f.content;
      }
    });

    try {
      const response = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logs,
          files: filesPayload,
          errorText: errorText || "Container crashed or reported dependencies failure.",
          qwenApiKey: qwenKey
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setDiagnosticResult({
          errorAnalysis: data.errorAnalysis,
          brokenFileName: data.brokenFileName,
          fixedContent: data.fixedContent,
          explanation: data.explanation
        });
        setEngineUsed(data.engine || "Vortex AI");
      } else {
        setApiError(data.error || "Failed to parse AI diagnostics. Verify your internet configuration.");
      }
    } catch (err: any) {
      setApiError("Error connecting to diagnostics engine: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFixApplyClick = () => {
    if (!diagnosticResult) return;
    onApplyFix(diagnosticResult.brokenFileName, diagnosticResult.fixedContent);
    setApplied(true);
  };

  const isCrashed = status === "CRASHED" || errorText.length > 0;

  return (
    <div id="ai-diagnostics-viewport" className="space-y-4">
      
      {/* 1. Header Hero Panel */}
      <div id="diagnose-header-card" className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0e0e13]/90 p-5 shadow-xl backdrop-blur-md">
        
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Sparkles className="text-purple-400" size={14} />
              <h3 className="text-xs font-black uppercase tracking-widest text-white">
                Vortex AI Diagnostic Engine
              </h3>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed max-w-sm">
              Sandbox linking daemon. If script loops or missing dependencies crash the container, this core parses operational stack traces to apply hot-patches.
            </p>
          </div>
          <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-2 shrink-0">
            <Bot className="text-purple-400" size={18} />
          </div>
        </div>

        {/* Action Trigger Section */}
        <div className="mt-4 border-t border-white/5 pt-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <div className={`h-2 w-2 rounded-full ${isCrashed ? "bg-rose-500 animate-pulse" : "bg-emerald-400"}`} />
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              {isCrashed ? "EXCEPTION DETECTED" : "CONTAINER STABLE"}
            </span>
          </div>

          <motion.button
            id="trigger-diagnosis-btn"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={runDiagnostics}
            disabled={loading}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-black tracking-wider uppercase text-white shadow-md active:scale-95 cursor-pointer ${
              isCrashed
                ? "bg-purple-600 hover:bg-purple-500 shadow-[0_2px_10px_rgba(168,85,247,0.2)]"
                : "bg-white/5 border border-white/5 hover:bg-white/10"
            }`}
          >
            {loading ? (
              <>
                <RefreshCw size={12} className="animate-spin" />
                ANALYZING LOGS...
              </>
            ) : (
              <>
                <Sparkles size={12} />
                RUN DIAGNOSTICS
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* 2. Error Display Banner if crashed but not analyzed */}
      {isCrashed && !diagnosticResult && !loading && (
        <div id="crash-alert-banner" className="flex items-start gap-3 rounded-xl border border-rose-500/10 bg-rose-950/10 p-4">
          <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={16} />
          <div className="space-y-1">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-400">Sandbox Exception Logged</h4>
            <p className="text-xs text-rose-300/80 leading-relaxed">
              {errorText || "Your bot failed to load or run. Press 'RUN DIAGNOSTICS' above to heal this container instantly."}
            </p>
          </div>
        </div>
      )}

      {/* 3. API Error details */}
      {apiError && (
        <div id="ai-error-banner" className="rounded-xl border border-rose-500/10 bg-[#0c0509] p-4 text-xs font-semibold text-rose-400">
          {apiError}
        </div>
      )}

      {/* 4. Interactive Healing Diagnostics Results */}
      {diagnosticResult && (
        <div id="diagnostic-results-wrapper" className="space-y-4 animate-fade-in">
          
          {/* Analysis & Explanations */}
          <div id="diagnostic-metadata-card" className="rounded-2xl border border-white/5 bg-[#0e0e13]/80 p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
              <span className="text-[9px] font-black uppercase tracking-widest text-purple-400 font-mono">
                ANALYSIS LOG // {engineUsed}
              </span>
              <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-400">
                <CheckCircle size={10} />
                Solution Found
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Error Cause</h4>
                <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                  {diagnosticResult.errorAnalysis}
                </p>
              </div>

              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Proposed Correction</h4>
                <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                  {diagnosticResult.explanation}
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Code Diff Viewer */}
          <div id="code-diff-card" className="rounded-2xl border border-white/5 bg-[#08080c] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 bg-[#0e0e13] px-4 py-2.5">
              <div className="flex items-center gap-2 font-mono">
                <FileCode size={14} className="text-purple-400" />
                <span className="text-xs font-black uppercase text-purple-200">
                  Target: <span className="text-pink-400">{diagnosticResult.brokenFileName}</span>
                </span>
              </div>
            </div>

            {/* Side-by-Side compare simulation */}
            <div className="grid grid-cols-1 font-mono text-[11px] bg-black/60 divide-y divide-white/5">
              {/* Original preview */}
              <div className="p-4 space-y-1 max-h-40 overflow-y-auto">
                <div className="text-[9px] uppercase font-black tracking-widest text-rose-500/60 pb-1 border-b border-rose-500/5 mb-1">
                  Original Source (With Bug)
                </div>
                <div className="text-gray-600 line-through select-none whitespace-pre-wrap">
                  {files.find((f) => f.name === diagnosticResult.brokenFileName)?.content || "// Empty or deleted file"}
                </div>
              </div>

              {/* Fixed preview */}
              <div className="p-4 space-y-1 max-h-40 overflow-y-auto bg-purple-950/5">
                <div className="text-[9px] uppercase font-black tracking-widest text-emerald-400/60 pb-1 border-b border-emerald-500/5 mb-1">
                  Suggested Source (Repaired Code)
                </div>
                <div className="text-emerald-400/90 whitespace-pre-wrap">
                  {diagnosticResult.fixedContent}
                </div>
              </div>
            </div>

            {/* Diff Action footer */}
            <div className="border-t border-white/5 bg-[#0e0e13] px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                <ShieldCheck size={14} className="text-purple-500 shrink-0" />
                <span>Applying will overwrite original code.</span>
              </div>

              <motion.button
                id="apply-fix-btn"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleFixApplyClick}
                disabled={applied}
                className={`flex items-center justify-center gap-2 rounded-xl py-2 px-4 text-xs font-black tracking-wider uppercase text-white shadow-md transition-all active:scale-95 cursor-pointer ${
                  applied
                    ? "bg-emerald-600/40 pointer-events-none"
                    : "bg-emerald-600 hover:bg-emerald-500 shadow-[0_2px_10px_rgba(16,185,129,0.25)]"
                }`}
              >
                {applied ? (
                  <>
                    <Check size={12} />
                    HEAL APPLIED!
                  </>
                ) : (
                  <>
                    <Sparkles size={12} />
                    APPLY AUTO HEAL
                  </>
                )}
              </motion.button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
