import React from "react";
import { Play, Eye, EyeOff, Key, ShieldCheck } from "lucide-react";
import { StartupVariable } from "../types";

interface StartupTabProps {
  variables: StartupVariable[];
  /** Scoped updater for the active container's variables (function-updater style). */
  setVariables: (updater: (vars: StartupVariable[]) => StartupVariable[]) => void;
  startupCommand: string;
  setStartupCommand: (cmd: string) => void;
  qwenKey: string;
  setQwenKey: (key: string) => void;
}

export default function StartupTab({
  variables,
  setVariables,
  startupCommand,
  setStartupCommand,
  qwenKey,
  setQwenKey
}: StartupTabProps) {
  const [showKey, setShowKey] = React.useState(false);

  const handleVariableChange = (key: string, val: string) => {
    setVariables((prev) =>
      prev.map((v) => (v.key === key ? { ...v, value: val } : v))
    );
  };

  return (
    <div id="startup-tab-viewport" className="space-y-4">
      
      {/* 1. Core Startup Command Deck */}
      <div id="startup-command-card" className="rounded-2xl border border-purple-500/10 bg-[#0c0817]/80 backdrop-blur-md p-6 space-y-4">
        <h3 className="text-md font-black uppercase tracking-wider text-white flex items-center gap-2">
          <Play size={18} className="text-purple-400" />
          Startup Configuration Command
        </h3>
        <p className="text-xs text-purple-300/80 leading-relaxed max-w-2xl">
          The following command defines how the container boots. This panel parses the workspace files to automate standard Node.js bot executions.
        </p>

        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-purple-400">Startup Command</label>
          <input
            id="startup-command-input"
            type="text"
            value={startupCommand}
            onChange={(e) => setStartupCommand(e.target.value)}
            className="w-full rounded-xl border border-purple-500/10 bg-[#060409] px-4 py-3 text-sm font-mono text-white outline-none focus:border-purple-500/30"
          />
        </div>
      </div>

      {/* 2. Custom Qwen AI Configuration Deck */}
      <div id="qwen-secret-card" className="rounded-2xl border border-purple-500/15 bg-[#0e0a1b]/90 backdrop-blur-md p-6 space-y-4 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
        <div className="flex items-center justify-between">
          <h3 className="text-md font-black uppercase tracking-wider text-white flex items-center gap-2">
            <Key size={18} className="text-pink-400 animate-pulse" />
            QWEN AI Diagnostics API Gateway
          </h3>
          <span className="rounded-full bg-purple-950/60 border border-purple-500/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-purple-300">
            Secure Server Sandbox
          </span>
        </div>
        <p className="text-xs text-purple-300/80 leading-relaxed max-w-2xl">
          Optionally enter your personal **Qwen AI API Key** below. Requests are proxied through the Vortex Panel server so the key is never embedded in the client bundle.
          <br />
          <span className="text-amber-400 font-bold mt-1 inline-block">
            * Storage: the key is kept in this browser tab's session storage (cleared when the tab closes). If you leave it empty, the server falls back to its own Gemini API key when one is configured.
          </span>
        </p>

        <div className="space-y-1 relative">
          <label className="text-[10px] font-black uppercase tracking-widest text-purple-400">Qwen API Key</label>
          <div className="relative">
            <input
              id="qwen-api-key-input"
              type={showKey ? "text" : "password"}
              value={qwenKey}
              onChange={(e) => setQwenKey(e.target.value)}
              placeholder="e.g. sk-qwen..."
              className="w-full rounded-xl border border-purple-500/10 bg-[#060409] pl-4 pr-12 py-3 text-sm font-mono text-white outline-none focus:border-purple-500/30"
            />
            <button
              id="toggle-qwen-key-visibility"
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-purple-400 transition-colors"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-lg border border-purple-500/5 bg-[#050308]/40 p-3 text-xs text-purple-300/60">
          <ShieldCheck size={16} className="text-purple-500 shrink-0" />
          <span>This key is securely routed over HTTPS and used strictly to execute diagnostics on container terminal logs.</span>
        </div>
      </div>

      {/* 3. Startup Variables Deck */}
      <div id="startup-variables-deck" className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {variables.map((variable) => (
          <div
            key={variable.key}
            id={`var-card-${variable.key}`}
            className="rounded-2xl border border-purple-500/10 bg-[#0c0817]/80 p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 font-mono">
                {variable.key}
              </span>
              <span className="text-[9px] uppercase tracking-widest font-extrabold text-gray-500">
                User Variable
              </span>
            </div>
            
            <div className="space-y-1">
              <input
                id={`var-input-${variable.key}`}
                type="text"
                value={variable.value}
                onChange={(e) => handleVariableChange(variable.key, e.target.value)}
                className="w-full rounded-lg border border-purple-500/10 bg-[#060409] px-3 py-2 text-xs font-mono text-white outline-none focus:border-purple-500/30"
              />
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed">
              {variable.description}
            </p>
          </div>
        ))}
      </div>

    </div>
  );
}
