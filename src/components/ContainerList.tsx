import React from "react";
import { motion } from "motion/react";
import { Cpu, Server, Plus, Power, Trash2, Layers, HelpCircle } from "lucide-react";
import { Container } from "../types";

interface ContainerListProps {
  containers: Container[];
  onSelect: (id: string) => void;
  onAddContainer: (name: string, description: string) => void;
  onDeleteContainer: (id: string) => void;
  userEmail: string;
}

export default function ContainerList({
  containers,
  onSelect,
  onAddContainer,
  onDeleteContainer,
  userEmail
}: ContainerListProps) {
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newDesc, setNewDesc] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    onAddContainer(newName, newDesc || "Custom virtual application runner node");
    setNewName("");
    setNewDesc("");
    setShowAddForm(false);
  };

  return (
    <div id="containers-list-viewport" className="w-full max-w-5xl mx-auto px-4 py-8 space-y-6">
      
      {/* 1. Header Grid */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-5">
        <div>
          <h2 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-2">
            <Server size={20} className="text-purple-400" />
            VPS Virtual Containers
          </h2>
          <p className="text-xs text-gray-400 tracking-wide font-semibold uppercase mt-0.5">
            Admin: <span className="text-purple-400 font-mono font-bold lowercase">{userEmail}</span> • Multi-Instance Sandbox
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 px-4 py-3 text-xs font-black uppercase tracking-wider text-white hover:bg-purple-500 shadow-lg cursor-pointer transition-colors"
        >
          <Plus size={14} />
          Create Container
        </motion.button>
      </div>

      {/* 2. Create Container Modal / Form Drawer */}
      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/5 bg-[#0e0e13]/80 p-5 space-y-4"
        >
          <h3 className="text-xs font-black uppercase tracking-widest text-purple-400">
            Initialize New Virtual Runner
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Node Name</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Telegram Scraper Node"
                className="w-full rounded-xl border border-white/5 bg-[#060609] px-4 py-2.5 text-xs text-white outline-none focus:border-purple-500/30"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Description</label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="e.g. Scrapes feeds and forwards webhook updates"
                className="w-full rounded-xl border border-white/5 bg-[#060609] px-4 py-2.5 text-xs text-white outline-none focus:border-purple-500/30"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-lg px-3 py-2 text-xs font-black uppercase text-gray-500 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-black uppercase text-white hover:bg-purple-500 transition-colors"
              >
                Launch Container
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* 3. Containers Cards Deck */}
      <div id="containers-grid" className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {containers.map((c) => (
          <motion.div
            key={c.id}
            id={`container-card-${c.id}`}
            whileHover={{ y: -3, borderColor: "rgba(168, 85, 247, 0.25)" }}
            className="rounded-2xl border border-white/5 bg-[#0e0e13]/80 p-5 flex flex-col justify-between space-y-4 shadow-lg backdrop-blur-md relative overflow-hidden"
          >
            {/* Status light glow background */}
            <div className={`absolute top-0 right-0 h-24 w-24 rounded-full blur-[40px] opacity-10 ${
              c.status === "RUNNING" ? "bg-emerald-500" :
              c.status === "INSTALLING" ? "bg-amber-500" :
              c.status === "CRASHED" ? "bg-rose-500" : "bg-gray-500"
            }`} />

            {/* Title Block */}
            <div className="space-y-1.5 z-10">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-black uppercase text-purple-400">
                  NODE-VPS // {c.id}
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                  c.status === "RUNNING" ? "bg-emerald-950/55 border border-emerald-500/25 text-emerald-400 animate-pulse" :
                  c.status === "INSTALLING" ? "bg-amber-950/55 border border-amber-500/25 text-amber-400" :
                  c.status === "CRASHED" ? "bg-rose-950/55 border border-rose-500/25 text-rose-400" :
                  "bg-gray-900 border border-gray-800 text-gray-500"
                }`}>
                  <Power size={10} />
                  {c.status}
                </span>
              </div>
              <h3 className="text-md font-black text-white">{c.name}</h3>
              <p className="text-xs text-gray-400 leading-relaxed max-w-sm">
                {c.description}
              </p>
            </div>

            {/* Hardware allocations (0 / Unlimited values!) */}
            <div className="grid grid-cols-3 gap-2 border-t border-b border-white/5 py-3.5 text-center font-mono">
              <div className="space-y-0.5">
                <div className="text-[9px] font-black uppercase text-gray-500 tracking-wider">CPU</div>
                <div className="text-xs font-black text-gray-200">
                  {c.status === "RUNNING" ? `${c.stats.cpu.toFixed(0)}%` : "0%"}
                </div>
              </div>
              <div className="space-y-0.5">
                <div className="text-[9px] font-black uppercase text-gray-500 tracking-wider">RAM Memory</div>
                <div className="text-xs font-black text-purple-400 flex items-center justify-center gap-0.5" title="0 implies Unlimited resources!">
                  <span>0</span>
                  <span className="text-[10px] text-gray-500 font-bold uppercase">(Unlimited)</span>
                </div>
              </div>
              <div className="space-y-0.5">
                <div className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Storage SSD</div>
                <div className="text-xs font-black text-purple-400 flex items-center justify-center gap-0.5" title="0 implies Unlimited storage!">
                  <span>0</span>
                  <span className="text-[10px] text-gray-500 font-bold uppercase">(Unlimited)</span>
                </div>
              </div>
            </div>

            {/* Action deck */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect(c.id)}
                className="flex-1 rounded-xl bg-purple-600 hover:bg-purple-500 py-2.5 text-xs font-black uppercase text-white tracking-wider cursor-pointer shadow-md transition-colors"
              >
                Manage Node
              </motion.button>
              
              {containers.length > 1 && (
                <button
                  onClick={() => onDeleteContainer(c.id)}
                  className="rounded-xl border border-white/5 hover:border-rose-500/20 bg-rose-950/5 hover:bg-rose-950/20 p-2.5 text-gray-500 hover:text-rose-400 transition-all cursor-pointer"
                  title="Terminate Node"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

          </motion.div>
        ))}
      </div>

    </div>
  );
}
