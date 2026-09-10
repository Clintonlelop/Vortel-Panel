import React, { useState } from "react";
import { Globe, Plus, Unlink, Wifi, ShieldAlert } from "lucide-react";
import { NetworkPort } from "../types";

export default function NetworkTab() {
  const [ports, setPorts] = useState<NetworkPort[]>([
    { id: "1", port: 3000, protocol: "TCP", isPrimary: true, status: "ONLINE" },
    { id: "2", port: 8080, protocol: "TCP", isPrimary: false, status: "ONLINE" },
    { id: "3", port: 2022, protocol: "TCP", isPrimary: false, status: "OFFLINE" }
  ]);

  const createPort = () => {
    const nextPortNum = Math.floor(Math.random() * 8000) + 1000;
    const newPort: NetworkPort = {
      id: String(ports.length + 1),
      port: nextPortNum,
      protocol: "TCP",
      isPrimary: false,
      status: "ONLINE"
    };
    setPorts([...ports, newPort]);
  };

  const deletePort = (id: string) => {
    setPorts(ports.filter((p) => p.id !== id || p.isPrimary));
  };

  return (
    <div id="network-tab-viewport" className="space-y-4">
      
      {/* Network Header */}
      <div id="network-header-card" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-[#0e0a1b]/60 border border-purple-500/10 p-5 rounded-2xl backdrop-blur-md">
        <div className="space-y-1">
          <h3 className="text-md font-black uppercase tracking-wider text-white flex items-center gap-2">
            <Globe size={18} className="text-purple-400" />
            Port Allocations
          </h3>
          <p className="text-xs text-purple-300/80 leading-relaxed max-w-2xl">
            This panel handles outbound bindings and domain networking triggers for WhatsApp Web listening nodes and Telegram webhook clients.
          </p>
        </div>
        <button
          id="alloc-port-btn"
          onClick={createPort}
          className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white hover:bg-purple-500 shadow-[0_2px_10px_rgba(168,85,247,0.3)] transition-colors self-end sm:self-auto cursor-pointer"
        >
          <Plus size={14} />
          Allocate Port
        </button>
      </div>

      {/* Port Allocation Grid */}
      <div id="ports-grid" className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {ports.map((p) => (
          <div
            key={p.id}
            id={`port-card-${p.port}`}
            className="rounded-2xl border border-purple-500/10 bg-[#0c0817]/80 p-5 space-y-4 shadow-lg flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-purple-950/60 border border-purple-500/10 px-2.5 py-1 text-[10px] font-mono font-black text-purple-400">
                {p.protocol} // INBOUND
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${p.status === "ONLINE" ? "bg-emerald-500 animate-pulse" : "bg-gray-600"}`} />
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  {p.status}
                </span>
              </div>
            </div>

            <div className="space-y-1 py-1">
              <div className="text-2xl font-black text-white font-mono tracking-tight">
                {p.port}
              </div>
              <div className="text-[10px] font-mono text-purple-400/80 font-bold tracking-wider uppercase">
                srv-4895-nodejs.pappy.duckdns.org:{p.port}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-purple-500/5 pt-3">
              <span className="text-[10px] font-black uppercase text-purple-400/60">
                {p.isPrimary ? "Primary Interface" : "Secondary Binding"}
              </span>
              {!p.isPrimary && (
                <button
                  id={`delete-port-btn-${p.port}`}
                  onClick={() => deletePort(p.id)}
                  className="rounded-lg p-1 text-gray-500 hover:bg-rose-950/30 hover:text-rose-400 transition-colors"
                  title="Remove Allocation"
                >
                  <Unlink size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-purple-500/5 bg-[#050308]/40 p-4 text-xs text-purple-300/60 flex items-start gap-2">
        <ShieldAlert size={16} className="text-purple-500 shrink-0 mt-0.5" />
        <span>Ensure your bot scripts bind to IP 0.0.0.0 instead of 127.0.0.1 to route public events successfully.</span>
      </div>

    </div>
  );
}
