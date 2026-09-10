import React, { useRef, useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Play,
  Square,
  Zap,
  RefreshCw,
  Terminal as TermIcon,
  ChevronDown,
  ChevronUp,
  Cpu,
  Database,
  Globe,
  Sliders
} from "lucide-react";
import { ConsoleLog, ServerStats } from "../types";

interface ConsoleTabProps {
  stats: ServerStats;
  logs: ConsoleLog[];
  onCommand: (cmd: string) => void;
  onActionClick: (action: "START" | "STOP" | "KILL" | "RESTART" | "INSTALL") => void;
  showQrCode: boolean;
  isInstalled: boolean;
}

export default function ConsoleTab({
  stats,
  logs,
  onCommand,
  onActionClick,
  showQrCode,
  isInstalled
}: ConsoleTabProps) {
  const [showStats, setShowStats] = useState(true);
  const [commandInput, setCommandInput] = useState("");
  const freedomGauge = 100; // Unlimited pipeline (static gauge)
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Canvas graph refs for real-time plotting
  const cpuCanvasRef = useRef<HTMLCanvasElement>(null);
  const memCanvasRef = useRef<HTMLCanvasElement>(null);
  const netCanvasRef = useRef<HTMLCanvasElement>(null);

  // Keep history arrays for plotting
  const cpuHistory = useRef<number[]>(Array(30).fill(0));
  const memHistory = useRef<number[]>(Array(30).fill(0));
  const netHistory = useRef<number[]>(Array(30).fill(0));

  // Update canvas history and redraw
  useEffect(() => {
    // Add current stats to history
    cpuHistory.current.push(stats.cpu);
    if (cpuHistory.current.length > 30) cpuHistory.current.shift();

    memHistory.current.push(stats.memory);
    if (memHistory.current.length > 30) memHistory.current.shift();

    netHistory.current.push((stats.networkIn + stats.networkOut) / 1024); // in KB
    if (netHistory.current.length > 30) netHistory.current.shift();

    const drawGraph = (canvas: HTMLCanvasElement | null, data: number[], color: string, maxVal: number) => {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Gradient background fill
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, `${color}20`);
      grad.addColorStop(1, `${color}01`);
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.moveTo(0, height);

      // Plot data points
      const step = width / (data.length - 1);
      data.forEach((val, index) => {
        const x = index * step;
        const normVal = Math.min(val / maxVal, 1);
        const y = height - normVal * (height - 8) - 4;
        ctx.lineTo(x, y);
      });
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      // Plot line
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      data.forEach((val, index) => {
        const x = index * step;
        const normVal = Math.min(val / maxVal, 1);
        const y = height - normVal * (height - 8) - 4;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    };

    drawGraph(cpuCanvasRef.current, cpuHistory.current, "#a855f7", 100);
    drawGraph(memCanvasRef.current, memHistory.current, "#ec4899", 512);
    drawGraph(netCanvasRef.current, netHistory.current, "#10b981", 1000);
  }, [stats]);

  // Handle auto scroll of logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;
    onCommand(commandInput.trim());
    setCommandInput("");
  };

  return (
    <div id="console-tab-viewport" className="space-y-4">
      
      {/* 1. High-Fidelity Animated Button Control Deck */}
      <div id="server-action-deck" className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        
        {/* START Button */}
        <motion.button
          id="action-btn-start"
          whileHover={{ scale: 1.02, boxShadow: "0 0 15px rgba(16,185,129,0.3)" }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onActionClick("START")}
          disabled={stats.status === "RUNNING" || stats.status === "INSTALLING"}
          className="flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3.5 px-3 text-[11px] font-black tracking-wider text-white shadow-lg active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
        >
          <Play size={12} fill="currentColor" />
          START BOT
        </motion.button>

        {/* NPM INSTALL Button */}
        <motion.button
          id="action-btn-install"
          whileHover={{ scale: 1.02, boxShadow: isInstalled ? "" : "0 0 15px rgba(245,158,11,0.3)" }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onActionClick("INSTALL")}
          disabled={stats.status === "INSTALLING" || stats.status === "RUNNING"}
          className={`flex items-center justify-center gap-2.5 rounded-xl py-3.5 px-3 text-[11px] font-black tracking-wider shadow-lg active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer ${
            isInstalled 
              ? "bg-neutral-800 text-emerald-400 border border-emerald-500/20" 
              : "bg-gradient-to-r from-amber-500 to-yellow-600 text-white"
          }`}
        >
          <RefreshCw size={12} className={stats.status === "INSTALLING" ? "animate-spin" : ""} />
          {isInstalled ? "NPM SYNCED" : "NPM INSTALL"}
        </motion.button>

        {/* STOP Button */}
        <motion.button
          id="action-btn-stop"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onActionClick("STOP")}
          disabled={stats.status === "OFFLINE"}
          className="flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 py-3.5 px-3 text-[11px] font-black tracking-wider text-white hover:from-amber-500 hover:to-orange-500 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
        >
          <Square size={10} fill="currentColor" />
          STOP
        </motion.button>

        {/* KILL Button */}
        <motion.button
          id="action-btn-kill"
          whileHover={{ scale: 1.02, boxShadow: "0 0 15px rgba(239,68,68,0.25)" }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onActionClick("KILL")}
          disabled={stats.status === "OFFLINE"}
          className="flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-rose-700 to-red-800 py-3.5 px-3 text-[11px] font-black tracking-wider text-white hover:from-rose-600 hover:to-red-700 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
        >
          <Zap size={10} fill="currentColor" />
          FORCE KILL
        </motion.button>

        {/* RESTART Button */}
        <motion.button
          id="action-btn-restart"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onActionClick("RESTART")}
          className="flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-3.5 px-3 text-[11px] font-black tracking-wider text-white hover:from-purple-500 hover:to-indigo-500 active:scale-95 transition-all cursor-pointer"
        >
          <RefreshCw size={10} className={stats.status === "RUNNING" ? "animate-spin" : ""} />
          RELOAD
        </motion.button>
      </div>

      {/* 2. Show Stats Accordion Container (0/Unlimited resources representation) */}
      <div id="stats-accordion-card" className="rounded-2xl border border-white/5 bg-[#0e0e13]/80 backdrop-blur-md overflow-hidden">
        <button
          id="toggle-stats-btn"
          onClick={() => setShowStats(!showStats)}
          className="flex w-full items-center justify-between p-4 text-xs font-black uppercase tracking-widest text-purple-400 hover:bg-white/2"
        >
          <span className="flex items-center gap-2">
            <Sliders size={14} />
            Container System Specs
          </span>
          {showStats ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showStats && (
          <div id="stats-accordion-body" className="border-t border-white/5 p-5 space-y-4">
            {/* Sliding freedom control panel gauge */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] tracking-widest font-black uppercase text-gray-500">
                <span>VORTEX BANDWIDTH</span>
                <span className="text-purple-400">0 (UNLIMITED CORE PIPELINE)</span>
              </div>
              <div className="relative h-2 rounded-full bg-black/60 overflow-hidden border border-white/5">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-600 to-indigo-400 transition-all duration-300"
                  style={{ width: "100%" }}
                />
              </div>
            </div>

            {/* Micro grid of server states */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-1 font-mono">
              <div className="rounded-xl border border-white/5 bg-black/45 p-3">
                <div className="text-[9px] font-black uppercase tracking-wider text-gray-500">Virtual host</div>
                <div className="text-xs font-bold text-gray-200 mt-0.5">0.0.0.0:3000</div>
              </div>
              <div className="rounded-xl border border-white/5 bg-black/45 p-3">
                <div className="text-[9px] font-black uppercase tracking-wider text-gray-500">Active Uptime</div>
                <div className="text-xs font-bold text-gray-200 mt-0.5">{stats.status === "RUNNING" ? stats.uptime : "Offline"}</div>
              </div>
              <div className="rounded-xl border border-white/5 bg-black/45 p-3">
                <div className="text-[9px] font-black uppercase tracking-wider text-purple-400">Memory Limit</div>
                <div className="text-xs font-bold text-white mt-0.5 flex items-center gap-1">
                  <span>0</span>
                  <span className="text-[9px] text-purple-400/80 font-black uppercase">(Unlimited)</span>
                </div>
              </div>
              <div className="rounded-xl border border-white/5 bg-black/45 p-3">
                <div className="text-[9px] font-black uppercase tracking-wider text-gray-500">Disk Storage</div>
                <div className="text-xs font-bold text-white mt-0.5 flex items-center gap-1">
                  <span>0</span>
                  <span className="text-[9px] text-purple-400/80 font-black uppercase">(Unlimited)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Terminal Terminal Workspace Display */}
      <div id="terminal-terminal-workspace" className="flex flex-col rounded-2xl border border-white/5 bg-[#09090d]/95 backdrop-blur-md shadow-xl overflow-hidden min-h-[380px]">
        
        {/* Terminal Header Bar */}
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 bg-[#0e0e13]">
          <div className="flex items-center gap-2">
            <TermIcon size={14} className="text-purple-400" />
            <span className="text-xs font-black tracking-widest uppercase text-purple-200 font-sans">
              Operational Logs Stream
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-purple-500/10" />
            <span className="h-2 w-2 rounded-full bg-purple-500/30" />
            <span className="h-2 w-2 rounded-full bg-purple-500/80 animate-ping" />
          </div>
        </div>

        {/* Inner Logs Stream Box */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-[12px] leading-relaxed select-text max-h-[320px] scrollbar-thin scrollbar-thumb-purple-950">
          {logs.map((log, index) => {
            let color = "text-gray-300";
            if (log.type === "system") color = "text-purple-400/80 font-bold";
            else if (log.type === "stderr" || log.type === "error") color = "text-rose-500 font-bold bg-rose-500/5 px-2 py-0.5 rounded-md border-l-2 border-rose-600";
            else if (log.type === "success") color = "text-emerald-400 font-medium";
            else if (log.type === "info") color = "text-sky-400";
            
            return (
              <div key={index} className="flex items-start gap-2 break-all">
                <span className="text-purple-800/60 text-[10px] pt-0.5 shrink-0 select-none">{log.timestamp}</span>
                <div className={`flex-1 whitespace-pre-wrap ${color}`}>
                  {log.text}
                </div>
              </div>
            );
          })}

          {/* Simulated WhatsApp Web QR Scan Box */}
          {showQrCode && (
            <div id="whatsapp-pairing-qr-box" className="my-4 max-w-sm rounded-xl border border-white/5 bg-[#060609] p-4 text-center shadow-lg border-dashed mx-auto animate-fade-in">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Device Link Protocol</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-purple-400">Scan Required</span>
              </div>
              <div className="mx-auto flex h-40 w-40 items-center justify-center bg-white p-2.5 rounded-lg border border-purple-500/20">
                <img
                  src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://github.com/clintonumelo15"
                  alt="Simulated WA QR Code"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-contain filter hue-rotate-30"
                />
              </div>
              <p className="mt-3 text-[11px] text-purple-300 font-bold">
                Scan using WhatsApp Link Device to link worker thread
              </p>
            </div>
          )}
          <div ref={logsEndRef} />
        </div>

        {/* Interactive Shell Terminal Prompt */}
        <form onSubmit={handleSubmit} className="border-t border-white/5 bg-black/60 flex items-center">
          <span className="text-purple-400 font-mono font-bold pl-4 text-xs shrink-0 select-none">
            container@vortex~ $
          </span>
          <input
            id="terminal-prompt-input"
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder="e.g. npm install, npm start, clear..."
            className="flex-1 bg-transparent px-3 py-3 text-xs font-mono text-white placeholder-gray-600 outline-none focus:ring-0"
            autoComplete="off"
          />
        </form>
      </div>

      {/* 4. Real-time Graphic Performance Charts (Unlimited-capped grids) */}
      <div id="graphic-performance-charts" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* CPU Chart */}
        <div className="rounded-2xl border border-white/5 bg-[#0e0e13]/60 backdrop-blur-md p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-purple-300">
              <Cpu size={12} className="text-purple-400" />
              CPU virtual load
            </span>
            <span className="text-xs font-bold font-mono text-purple-400">{stats.cpu.toFixed(1)}%</span>
          </div>
          <div className="h-20 rounded-lg bg-black/40 p-1 border border-white/5 relative">
            <canvas ref={cpuCanvasRef} width={220} height={80} className="w-full h-full" />
          </div>
        </div>

        {/* Memory Chart */}
        <div className="rounded-2xl border border-white/5 bg-[#0e0e13]/60 backdrop-blur-md p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-pink-300">
              <Database size={12} className="text-pink-400" />
              unlimited RAM
            </span>
            <span className="text-xs font-bold font-mono text-pink-400">0 / Unlimited</span>
          </div>
          <div className="h-20 rounded-lg bg-black/40 p-1 border border-white/5 relative">
            <canvas ref={memCanvasRef} width={220} height={80} className="w-full h-full" />
          </div>
        </div>

        {/* Network Chart */}
        <div className="rounded-2xl border border-white/5 bg-[#0e0e13]/60 backdrop-blur-md p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-300">
              <Globe size={12} className="text-emerald-400" />
              unlimited traffic
            </span>
            <span className="text-xs font-bold font-mono text-emerald-400">
              {((stats.networkIn + stats.networkOut) / 1024).toFixed(1)} KB/s
            </span>
          </div>
          <div className="h-20 rounded-lg bg-black/40 p-1 border border-white/5 relative">
            <canvas ref={netCanvasRef} width={220} height={80} className="w-full h-full" />
          </div>
        </div>
      </div>

    </div>
  );
}
