import React from "react";
import {
  Terminal,
  Folder,
  Play,
  Globe,
  Activity,
  Database,
  Calendar,
  Archive,
  Users,
  Settings,
  ClipboardList,
  ExternalLink,
  LogOut,
  X,
  ArrowLeft,
  ShieldCheck
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  username: string;
  onBackToContainers: () => void;
  onLogout: () => void;
  containerName: string;
}

export default function Sidebar({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  username,
  onBackToContainers,
  onLogout,
  containerName
}: SidebarProps) {
  const menuItems = [
    { id: "console", label: "Console", icon: Terminal, category: "Control" },
    { id: "files", label: "Files", icon: Folder, category: "Control" },
    { id: "startup", label: "Startup", icon: Play, category: "Control" },
    { id: "network", label: "Network", icon: Globe, category: "Control" },
    { id: "metrics", label: "Metrics", icon: Activity, category: "Control" },

    { id: "databases", label: "Databases", icon: Database, category: "Management" },
    { id: "schedules", label: "Schedules", icon: Calendar, category: "Management" },
    { id: "backups", label: "Backups", icon: Archive, category: "Management" },

    { id: "users", label: "Users", icon: Users, category: "Administration" },
    { id: "settings", label: "Settings", icon: Settings, category: "Administration" },
    { id: "activity", label: "Activity", icon: ClipboardList, category: "Administration" },
  ];

  const categories = ["Control", "Management", "Administration"];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          id="sidebar-backdrop"
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Slide-out Panel Container */}
      <div
        id="sidebar-container"
        className={`fixed inset-y-0 left-0 z-50 w-72 flex-col justify-between border-r border-white/5 bg-[#0a0a0f] text-gray-300 transition-transform duration-300 ease-in-out lg:static lg:flex lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header Branding Panel */}
        <div id="sidebar-header" className="relative p-5 space-y-4">
          <button
            id="close-sidebar-btn"
            className="absolute top-4 right-4 text-purple-400 hover:text-white lg:hidden cursor-pointer"
            onClick={onClose}
          >
            <X size={20} />
          </button>

          {/* Brand Row */}
          <div id="sidebar-branding" className="flex items-center gap-2.5">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
              <ShieldCheck className="text-purple-400" size={22} />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-widest text-white uppercase font-mono">
                VORTEX PANEL
              </h1>
              <span className="text-[9px] uppercase tracking-widest text-gray-500 font-extrabold">
                UNLIMITED CORES
              </span>
            </div>
          </div>

          {/* Quick Return to Containers Index list */}
          <button
            id="back-to-containers-btn"
            onClick={() => {
              onBackToContainers();
              onClose();
            }}
            className="w-full flex items-center gap-2 rounded-xl border border-white/5 bg-white/2 hover:bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-wider text-purple-400 hover:text-purple-300 transition-all cursor-pointer"
          >
            <ArrowLeft size={14} />
            Switch Containers
          </button>

          {/* Active Container name indicator */}
          <div className="rounded-lg bg-black/40 border border-white/5 px-3.5 py-2.5">
            <span className="text-[8px] font-mono font-black uppercase text-gray-500 block">managing container</span>
            <span className="text-xs font-bold text-gray-200 block truncate">{containerName}</span>
          </div>
        </div>

        {/* Navigation Core */}
        <div id="sidebar-nav" className="flex-1 overflow-y-auto px-4 py-1 space-y-4 scrollbar-thin scrollbar-thumb-purple-950">
          {categories.map((category) => {
            const items = menuItems.filter((i) => i.category === category);
            return (
              <div key={category} className="space-y-1">
                <h3 className="px-3 text-[9px] font-black uppercase tracking-widest text-gray-500">
                  {category}
                </h3>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        id={`nav-item-${item.id}`}
                        onClick={() => {
                          setActiveTab(item.id);
                          onClose();
                        }}
                        className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                          isActive
                            ? "bg-purple-950/30 text-white border-l-2 border-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.05)]"
                            : "text-gray-400 hover:bg-white/2 hover:text-gray-200"
                        }`}
                      >
                        <Icon
                          size={14}
                          className={`transition-colors ${
                            isActive ? "text-purple-400" : "text-gray-500 group-hover:text-purple-400"
                          }`}
                        />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Resources & Guides Section */}
          <div className="space-y-1 pt-2">
            <h3 className="px-3 text-[9px] font-black uppercase tracking-widest text-gray-500">
              Resources
            </h3>
            <a
              id="vortex-docs-link"
              href="https://github.com/clintonumelo15"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wider text-gray-400 hover:bg-white/2 hover:text-gray-200"
            >
              <div className="flex items-center gap-3">
                <ExternalLink size={14} className="text-gray-500" />
                <span>Documentation</span>
              </div>
            </a>
          </div>
        </div>

        {/* User Workspace Profile Footer */}
        <div id="sidebar-footer" className="border-t border-white/5 p-4 bg-black/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 font-bold text-xs uppercase">
                {username.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <div className="text-[8px] font-black uppercase tracking-widest text-gray-500">
                  sandbox admin
                </div>
                <div className="text-xs font-bold text-white truncate max-w-[130px]">
                  {username}
                </div>
              </div>
            </div>
            <button
              id="logout-btn"
              onClick={onLogout}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-rose-950/20 hover:text-rose-400 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
