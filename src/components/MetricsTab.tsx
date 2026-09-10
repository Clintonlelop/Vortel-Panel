import React from "react";
import { Activity, Cpu, HardDrive, Network, Layers } from "lucide-react";
import { ServerStats } from "../types";

interface MetricsTabProps {
  stats: ServerStats;
}

export default function MetricsTab({ stats }: MetricsTabProps) {
  return (
    <div id="metrics-tab-viewport" className="space-y-4">
      
      {/* Metrics Description Card */}
      <div id="metrics-intro-card" className="bg-[#0e0e13]/80 border border-white/5 p-5 rounded-2xl backdrop-blur-md space-y-1">
        <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
          <Activity size={16} className="text-purple-400" />
          Hardware Allocations & Telemetry
        </h3>
        <p className="text-xs text-gray-400 leading-relaxed max-w-2xl">
          Real-time hypervisor resource mappings. Memory and storage quotas are unrestricted in this secure virtual environment.
        </p>
      </div>

      {/* Metrics Allocation Grid */}
      <div id="metrics-detailed-grid" className="grid grid-cols-1 gap-4 md:grid-cols-2">
        
        {/* CPU Monitor */}
        <div className="rounded-2xl border border-white/5 bg-[#0e0e13]/80 p-5 space-y-4">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-purple-300">
              <Cpu size={14} className="text-purple-400" />
              vCPU Core Load
            </span>
            <span className="text-xs font-bold font-mono text-purple-400">
              {stats.cpu.toFixed(1)} %
            </span>
          </div>

          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between text-xs">
              <span className="text-[9px] uppercase font-black tracking-widest text-gray-500">Virtualizer Thread (1 Core)</span>
              <span className="text-xs font-semibold font-mono text-gray-400">{stats.cpu > 80 ? "High Usage" : "Ideal"}</span>
            </div>
            <div className="overflow-hidden h-2 text-xs flex rounded-full bg-purple-950/20 border border-purple-500/10">
              <div
                style={{ width: `${stats.cpu}%` }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-purple-500 transition-all duration-300"
              />
            </div>
          </div>
          
          <div className="text-[9px] text-gray-500 leading-relaxed uppercase tracking-wide font-black">
            Core Speed: 3.40 GHz // GC cycles: Optimal
          </div>
        </div>

        {/* Memory Monitor (0 / Unlimited representation) */}
        <div className="rounded-2xl border border-white/5 bg-[#0e0e13]/80 p-5 space-y-4">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-pink-300">
              <Layers size={14} className="text-pink-400" />
              Memory Allocation (RAM)
            </span>
            <span className="text-xs font-bold font-mono text-pink-400">
              0 / Unlimited
            </span>
          </div>

          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between text-xs">
              <span className="text-[9px] uppercase font-black tracking-widest text-gray-500">V8 Isolated Heap Space</span>
              <span className="text-xs font-semibold font-mono text-pink-400">0 Limited (Unlimited Limit)</span>
            </div>
            <div className="overflow-hidden h-2 text-xs flex rounded-full bg-pink-950/20 border border-pink-500/10">
              <div
                style={{ width: `100%` }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-pink-500 transition-all duration-300"
              />
            </div>
          </div>

          <div className="text-[9px] text-gray-500 leading-relaxed uppercase tracking-wide font-black">
            Swap Allocation: 0 MB // Active Handles: Unrestricted
          </div>
        </div>

        {/* Disk Storage Monitor (0 / Unlimited representation) */}
        <div className="rounded-2xl border border-white/5 bg-[#0e0e13]/80 p-5 space-y-4">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-300">
              <HardDrive size={14} className="text-emerald-400" />
              SSD Partition Storage
            </span>
            <span className="text-xs font-bold font-mono text-emerald-400">
              0 / Unlimited
            </span>
          </div>

          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between text-xs">
              <span className="text-[9px] uppercase font-black tracking-widest text-gray-500">Virtual partition bounds</span>
              <span className="text-xs font-semibold font-mono text-emerald-400">Unlimited capacity</span>
            </div>
            <div className="overflow-hidden h-2 text-xs flex rounded-full bg-emerald-950/20 border border-emerald-500/10">
              <div
                style={{ width: `100%` }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-emerald-500 transition-all duration-300"
              />
            </div>
          </div>

          <div className="text-[9px] text-gray-500 leading-relaxed uppercase tracking-wide font-black">
            Disk Read/Write operations speed: Safe Capped at host max
          </div>
        </div>

        {/* Network Monitor */}
        <div className="rounded-2xl border border-white/5 bg-[#0e0e13]/80 p-5 space-y-4">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-sky-300">
              <Network size={14} className="text-sky-400" />
              Socket traffic
            </span>
            <span className="text-xs font-bold font-mono text-sky-400">
              {((stats.networkIn + stats.networkOut) / 1024).toFixed(1)} KB/s
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1 font-mono">
            <div className="rounded-xl border border-white/5 bg-black/45 p-3 text-center">
              <div className="text-[9px] font-black uppercase text-purple-400">Inbound (RX)</div>
              <div className="text-xs font-bold text-gray-300 mt-1">{(stats.networkIn / 1024).toFixed(1)} KB/s</div>
            </div>
            <div className="rounded-xl border border-white/5 bg-black/45 p-3 text-center">
              <div className="text-[9px] font-black uppercase text-purple-400">Outbound (TX)</div>
              <div className="text-xs font-bold text-gray-300 mt-1">{(stats.networkOut / 1024).toFixed(1)} KB/s</div>
            </div>
          </div>

          <div className="text-[9px] text-gray-500 leading-relaxed uppercase tracking-wide font-black">
            TCP/UDP bindings: 1 Ingress mapping // Packet loss: 0.0%
          </div>
        </div>

      </div>

    </div>
  );
}
