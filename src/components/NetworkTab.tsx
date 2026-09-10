import React, { useState } from "react";
import { Globe, Plus, Unlink, ShieldAlert } from "lucide-react";
import { NetworkPort } from "../types";

interface NetworkTabProps {
  ports: NetworkPort[];
  setPorts: (updater: (prev: NetworkPort[]) => NetworkPort[]) => void;
}

const HOST_SUFFIX = "your-vps-hostname";

export default function NetworkTab({ ports, setPorts }: NetworkTabProps) {
  const [newPort, setNewPort] = useState("");
  const [error, setError] = useState("");

  // Keep a local mirror so the controlled input works while typing
  const [inputValue, setInputValue] = useState("");

  // Ports without an explicit ONLINE status (e.g. legacy saved data) are
  // displayed as ONLINE via render-time derivation — NO setState in an effect
  // (a state update in an effect keyed on an unstable prop re-triggers forever).
  const displayPorts = ports.map((p) =>
    p.status === "ONLINE" ? p : { ...p, status: "ONLINE" as const }
  );

  const allocatePort = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(inputValue.trim());
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
      setError("Enter a valid port number (1–65535).");
      return;
    }
    if (ports.some((p) => p.port === parsed)) {
      setError(`Port ${parsed} is already allocated.`);
      return;
    }
    setError("");
    setPorts((prev) => [
      ...prev,
      {
        id: `port-${Date.now()}`,
        port: parsed,
        protocol: "TCP",
        isPrimary: false,
        status: "ONLINE",
      },
    ]);
    setInputValue("");
  };

  const deletePort = (id: string) => {
    const target = ports.find((p) => p.id === id);
    if (!target || target.isPrimary) return;
    if (!window.confirm(`Release port ${target.port}? Bots bound to it will stop receiving traffic.`)) return;
    setPorts((prev) => prev.filter((p) => p.id !== id));
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
            This panel manages inbound port bindings for this container's virtual network. Primary ports cannot be released.
          </p>
        </div>
        <form onSubmit={allocatePort} className="flex items-center gap-2 self-end sm:self-auto">
          <input
            id="alloc-port-input"
            type="number"
            min={1}
            max={65535}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setError("");
            }}
            placeholder="e.g. 5100"
            className="w-28 rounded-lg border border-purple-500/20 bg-[#060409] px-3 py-2.5 text-xs font-mono text-white placeholder-gray-600 outline-none focus:border-purple-500/40"
            aria-label="Port number to allocate"
          />
          <button
            id="alloc-port-btn"
            type="submit"
            className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white hover:bg-purple-500 shadow-[0_2px_10px_rgba(168,85,247,0.3)] transition-colors cursor-pointer"
          >
            <Plus size={14} />
            Allocate Port
          </button>
        </form>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/10 bg-rose-950/20 p-3 text-xs font-bold text-rose-400">
          {error}
        </div>
      )}

      {/* Port Allocation Grid */}
      <div id="ports-grid" className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {displayPorts.map((p) => (
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
                {HOST_SUFFIX}:{p.port}
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
                  title="Release allocation"
                  aria-label={`Release port ${p.port}`}
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
        <span>
          Bind your bot scripts to 0.0.0.0 (not 127.0.0.1) and open the port in your VPS firewall
          (e.g. <code className="font-mono text-purple-300">ufw allow {ports[0]?.port ?? 3000}/tcp</code>) to receive public traffic.
        </span>
      </div>
    </div>
  );
}
