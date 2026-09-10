import React, { useState, useEffect, useRef } from "react";
import { Menu, Terminal } from "lucide-react";

import AuthGate from "./components/AuthGate";
import ContainerList from "./components/ContainerList";
import Sidebar from "./components/Sidebar";
import BackgroundOverlay from "./components/BackgroundOverlay";
import ConsoleTab from "./components/ConsoleTab";
import FilesTab from "./components/FilesTab";
import StartupTab from "./components/StartupTab";
import NetworkTab from "./components/NetworkTab";
import MetricsTab from "./components/MetricsTab";
import AIDiagnostics from "./components/AIDiagnostics";
import CodeScanner from "./components/CodeScanner";

import { defaultFiles } from "./data/defaultFiles";
import { BotFile, ServerStats, ConsoleLog, StartupVariable, Container, User } from "./types";

const AUTH_KEY = "vortex_auth_user";
const CONTAINERS_KEY = "vortex_containers_data_v3";

export default function App() {
  // Session User State
  const [user, setUser] = useState<User | null>(() => {
    const cached = localStorage.getItem(AUTH_KEY);
    return cached ? JSON.parse(cached) : null;
  });

  // Isolated Container State list
  const [containers, setContainers] = useState<Container[]>(() => {
    const cached = localStorage.getItem(CONTAINERS_KEY);
    if (cached) {
      return JSON.parse(cached);
    }

    // Default container 1 (WhatsApp Daemon)
    const container1: Container = {
      id: "whatsapp-node",
      name: "WhatsApp Listener Daemon",
      description: "Primary webhook listener routing chat groups and dynamic responses.",
      status: "OFFLINE",
      stats: { status: "OFFLINE", cpu: 0, memory: 0, networkIn: 0, networkOut: 0, uptime: "Offline" },
      logs: [
        { text: "container@vortex~ Host Node initialized successfully.", type: "system", timestamp: "18:00:00" },
        { text: "container@vortex~ Environment Detected: Node.js (package.json present).", type: "info", timestamp: "18:00:01" },
        { text: "container@vortex~ Dependencies not synchronized. Execute 'NPM INSTALL' first.", type: "info", timestamp: "18:00:02" }
      ],
      files: defaultFiles,
      startupCommand: "node index.js",
      variables: [
        { key: "BOT_NAME", value: "VortexBot-WhatsApp", description: "Identity signature on outgoing protocols." },
        { key: "AUTO_REPLY", value: "true", description: "Toggle if the bot responds to common triggers instantly." },
        { key: "PORT", value: "3000", description: "Virtual webserver binding interface." }
      ],
      ports: [
        { id: "1", port: 3000, protocol: "TCP", isPrimary: true, status: "ONLINE" }
      ],
      showQrCode: false,
      errorText: "",
      isInstalled: false
    };

    // Default container 2 (Telegram Scraper)
    const container2: Container = {
      id: "telegram-node",
      name: "Telegram Scraper Worker",
      description: "Extracts real-time feeds from designated source channels and indexes events.",
      status: "OFFLINE",
      stats: { status: "OFFLINE", cpu: 0, memory: 0, networkIn: 0, networkOut: 0, uptime: "Offline" },
      logs: [
        { text: "container@vortex~ Host Node initialized successfully.", type: "system", timestamp: "18:10:00" },
        { text: "container@vortex~ Environment Detected: Python (main.py present).", type: "info", timestamp: "18:10:01" },
        { text: "container@vortex~ Modules ready. Execute startup commands.", type: "success", timestamp: "18:10:02" }
      ],
      files: [
        {
          name: "package.json",
          isFolder: false,
          size: "420 B",
          updatedAt: "Just Now",
          content: `{
  "name": "telegram-scraper",
  "version": "1.0.0",
  "main": "scraper.js",
  "scripts": {
    "start": "node scraper.js"
  },
  "dependencies": {
    "dotenv": "^16.0.0"
  }
}`
        },
        {
          name: "scraper.js",
          isFolder: false,
          size: "1.2 KB",
          updatedAt: "Just Now",
          content: `// TELEGRAM FEED SCRAPER DAEMON
const dotenv = require('dotenv');
console.log('[TelegramScraper] Initializing telemetry feeds...');
setInterval(() => {
  console.log('[Scraper] Listening on updates from feed...');
}, 3000);`
        }
      ],
      startupCommand: "node scraper.js",
      variables: [
        { key: "TELEGRAM_API_ID", value: "4820934", description: "Credentials hash for access points." },
        { key: "MONITOR_CHANNELS", value: "@crypto_updates", description: "Comma-delimited listen filters." }
      ],
      ports: [
        { id: "1", port: 8080, protocol: "TCP", isPrimary: true, status: "ONLINE" }
      ],
      showQrCode: false,
      errorText: "",
      isInstalled: false
    };

    return [container1, container2];
  });

  // Active Selected Container identifier
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);

  // Tab navigation states
  const [activeTab, setActiveTab] = useState<string>("console");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  const [qwenKey, setQwenKey] = useState<string>(() => {
    return localStorage.getItem("vortex_qwen_api_key") || "";
  });

  // Timer references for metrics loop
  const metricsTimer = useRef<NodeJS.Timeout | null>(null);
  const executionTimer = useRef<NodeJS.Timeout | null>(null);
  const uptimes = useRef<Record<string, number>>({});

  // Sync state to local storage when changes occur
  useEffect(() => {
    if (user) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_KEY);
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem(CONTAINERS_KEY, JSON.stringify(containers));
  }, [containers]);

  const handleAuthSuccess = (name: string, email: string) => {
    setUser({ username: name, email });
  };

  const handleLogout = () => {
    if (metricsTimer.current) {
      clearInterval(metricsTimer.current);
      metricsTimer.current = null;
    }
    if (executionTimer.current) {
      clearTimeout(executionTimer.current);
      executionTimer.current = null;
    }
    setUser(null);
    setSelectedContainerId(null);
  };

  const handleAddContainer = (name: string, description: string) => {
    const id = "custom-" + Math.random().toString(36).substr(2, 9);
    const newContainer: Container = {
      id,
      name,
      description,
      status: "OFFLINE",
      stats: { status: "OFFLINE", cpu: 0, memory: 0, networkIn: 0, networkOut: 0, uptime: "Offline" },
      logs: [
        { text: "container@vortex~ Host Node initialized successfully.", type: "system", timestamp: "Just Now" }
      ],
      files: [
        {
          name: "package.json",
          isFolder: false,
          size: "200 B",
          updatedAt: "Created",
          content: `{ "name": "${id}", "version": "1.0.0", "main": "index.js", "scripts": { "start": "node index.js" }, "dependencies": { "express": "^4.18.2" } }`
        },
        {
          name: "index.js",
          isFolder: false,
          size: "150 B",
          updatedAt: "Created",
          content: "console.log('Virtual server listening on port 5000...');"
        }
      ],
      startupCommand: "node index.js",
      variables: [
        { key: "PORT", value: "5000", description: "Dynamic container allocation port." }
      ],
      ports: [{ id: "1", port: 5000, protocol: "TCP", isPrimary: true, status: "ONLINE" }],
      showQrCode: false,
      errorText: "",
      isInstalled: false
    };
    setContainers((prev) => [...prev, newContainer]);
  };

  const handleDeleteContainer = (id: string) => {
    setContainers((prev) => prev.filter((c) => c.id !== id));
    if (selectedContainerId === id) {
      setSelectedContainerId(null);
    }
  };

  // Get active container reference
  const activeContainer = containers.find((c) => c.id === selectedContainerId) || null;

  // Sync variables/startup update helper
  const setFiles = (arg: React.SetStateAction<BotFile[]>) => {
    if (!selectedContainerId) return;
    setContainers((prev) =>
      prev.map((c) => {
        if (c.id === selectedContainerId) {
          const resolvedFiles = typeof arg === "function" ? arg(c.files) : arg;
          return { ...c, files: resolvedFiles };
        }
        return c;
      })
    );
  };

  const setVariables = (arg: React.SetStateAction<StartupVariable[]>) => {
    if (!selectedContainerId) return;
    setContainers((prev) =>
      prev.map((c) => {
        if (c.id === selectedContainerId) {
          const resolvedVars = typeof arg === "function" ? arg(c.variables) : arg;
          return { ...c, variables: resolvedVars };
        }
        return c;
      })
    );
  };

  const setStartupCommand = (cmd: string) => {
    if (!selectedContainerId) return;
    setContainers((prev) =>
      prev.map((c) => (c.id === selectedContainerId ? { ...c, startupCommand: cmd } : c))
    );
  };

  const handleSaveQwenKey = (newKey: string) => {
    setQwenKey(newKey);
    localStorage.setItem("vortex_qwen_api_key", newKey);
  };

  const addLog = (text: string, type: ConsoleLog["type"] = "stdout") => {
    if (!selectedContainerId) return;
    const now = new Date();
    const ts = now.toTimeString().split(" ")[0];
    setContainers((prev) =>
      prev.map((c) => {
        if (c.id === selectedContainerId) {
          return { ...c, logs: [...c.logs, { text, type, timestamp: ts }] };
        }
        return c;
      })
    );
  };

  const clearLogs = () => {
    if (!selectedContainerId) return;
    setContainers((prev) =>
      prev.map((c) => (c.id === selectedContainerId ? { ...c, logs: [] } : c))
    );
  };

  // Container metrics loops
  useEffect(() => {
    if (metricsTimer.current) {
      clearInterval(metricsTimer.current);
      metricsTimer.current = null;
    }

    metricsTimer.current = setInterval(() => {
      setContainers((prev) =>
        prev.map((c) => {
          if (c.status === "RUNNING") {
            const currentUptimeVal = uptimes.current[c.id] || 0;
            const updatedUptimeVal = currentUptimeVal + 1;
            uptimes.current[c.id] = updatedUptimeVal;

            const nextCpu = Math.max(8, Math.min(92, c.stats.cpu + (Math.random() * 10 - 5)));
            return {
              ...c,
              stats: {
                status: "RUNNING",
                cpu: nextCpu,
                memory: 0,
                networkIn: Math.floor(Math.random() * 80000) + 1000,
                networkOut: Math.floor(Math.random() * 40000) + 500,
                uptime: formatUptime(updatedUptimeVal)
              }
            };
          } else if (c.status === "INSTALLING") {
            return {
              ...c,
              stats: {
                status: "INSTALLING",
                cpu: 35,
                memory: 0,
                networkIn: 550000,
                networkOut: 6000,
                uptime: "Installing dependencies"
              }
            };
          } else {
            return {
              ...c,
              stats: {
                status: "OFFLINE",
                cpu: 0,
                memory: 0,
                networkIn: 0,
                networkOut: 0,
                uptime: "Offline"
              }
            };
          }
        })
      );
    }, 1000);

    return () => {
      if (metricsTimer.current) clearInterval(metricsTimer.current);
    };
  }, [selectedContainerId]);

  const formatUptime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  // Automated NPM Install pipeline
  const installContainerDependencies = () => {
    if (!activeContainer) return;
    if (activeContainer.status === "INSTALLING" || activeContainer.status === "RUNNING") return;

    setContainers((prev) =>
      prev.map((c) => (c.id === selectedContainerId ? { ...c, status: "INSTALLING" } : c))
    );

    addLog("container@vortex~ npm install", "system");
    addLog("npm info it worked if it ends with ok", "info");
    addLog("npm info using npm@10.2.0", "info");
    addLog("npm info using node@v20.9.0", "info");

    // Scan dependencies in package.json to print realistic download outputs
    const pkgFile = activeContainer.files.find((f) => f.name === "package.json");
    let deps: string[] = ["express"];
    if (pkgFile) {
      try {
        const parsed = JSON.parse(pkgFile.content);
        if (parsed.dependencies) deps = Object.keys(parsed.dependencies);
      } catch (e) {}
    }

    deps.forEach((dep, idx) => {
      setTimeout(() => {
        addLog(`npm http fetch GET 200 https://registry.npmjs.org/${dep} (size: 214KB)`, "stdout");
      }, (idx + 1) * 400);
    });

    setTimeout(() => {
      // Check for unresolvable broken packages in scenario simulations
      if (pkgFile && pkgFile.content.includes("broken-version-not-found-on-npm")) {
        setContainers((prev) =>
          prev.map((c) =>
            c.id === selectedContainerId
              ? {
                  ...c,
                  status: "CRASHED",
                  errorText: "NPM package resolution failed. The dependency 'qrcode-terminal-broken' was not found on the npm registry."
                }
              : c
          )
        );
        addLog("npm ERR! 404 Not Found - GET https://registry.npmjs.org/qrcode-terminal-broken", "error");
        addLog("npm ERR! A complete log of this run can be found in /home/container/.npm/_logs", "error");
      } else {
        setContainers((prev) =>
          prev.map((c) =>
            c.id === selectedContainerId
              ? { ...c, status: "OFFLINE", isInstalled: true, errorText: "" }
              : c
          )
        );
        addLog(`added ${deps.length} package modules successfully.`, "success");
        addLog("container@vortex~ Dependencies synchronized. Use 'NPM START' or click 'START BOT' to execute thread.", "system");
      }
    }, deps.length * 400 + 600);
  };

  // Automated startup code validator & scanner
  const startServerContainer = () => {
    if (!activeContainer) return;
    if (activeContainer.status === "RUNNING" || activeContainer.status === "INSTALLING") return;

    // 1. Strict Requirement check: Must run NPM install first
    if (!activeContainer.isInstalled) {
      setContainers((prev) =>
        prev.map((c) =>
          c.id === selectedContainerId
            ? {
                ...c,
                status: "CRASHED",
                errorText: "Error: Cannot find module 'qrcode-terminal' or required package dependencies. Please run 'NPM INSTALL' first to synchronize package modules."
              }
            : c
        )
      );
      addLog(`container@vortex~ Executing process: ${activeContainer.startupCommand}`, "system");
      addLog("node:internal/modules/cjs/loader:1080", "stderr");
      addLog("  throw err;", "stderr");
      addLog("  ^", "stderr");
      addLog("Error: Cannot find module 'qrcode-terminal'", "error");
      addLog("Require stack:", "stderr");
      addLog(" - /home/container/index.js", "stderr");
      addLog("container@vortex~ Process terminated with code 1.", "stderr");
      return;
    }

    // Reset crash states
    setContainers((prev) =>
      prev.map((c) =>
        c.id === selectedContainerId
          ? { ...c, errorText: "", showQrCode: false, status: "RUNNING" }
          : c
      )
    );

    addLog(`container@vortex~ Booting process: ${activeContainer.startupCommand}`, "system");

    // Inspect files to trigger real syntax errors or exceptions
    const indexFile = activeContainer.files.find((f) => f.name === "index.js");

    // Static code error: require syntax typo
    if (indexFile && indexFile.content.includes("require('fs'{;")) {
      executionTimer.current = setTimeout(() => {
        setContainers((prev) =>
          prev.map((c) =>
            c.id === selectedContainerId
              ? {
                  ...c,
                  status: "CRASHED",
                  errorText: "SyntaxError: Unexpected token '{' at /home/container/index.js:2"
                }
              : c
          )
        );
        addLog("internal/modules/cjs/loader.js:818", "stderr");
        addLog("/home/container/index.js:2", "stderr");
        addLog("const fs = require('fs'{;", "stderr");
        addLog("                      ^", "stderr");
        addLog("SyntaxError: Unexpected token '{'", "error");
        addLog("container@vortex~ Process terminated with code 1 (Crashed)", "stderr");
      }, 1500);
      return;
    }

    // Static code error: missing config file parser
    if (indexFile && indexFile.content.includes("fs.readFileSync('./config.json'") && !activeContainer.files.some((f) => f.name === "config.json")) {
      executionTimer.current = setTimeout(() => {
        setContainers((prev) =>
          prev.map((c) =>
            c.id === selectedContainerId
              ? {
                  ...c,
                  status: "CRASHED",
                  errorText: "Error: ENOENT: no such file or directory, open './config.json'"
                }
              : c
          )
        );
        addLog("[VortexBot ERROR] Failed to load config.json! File is corrupted or missing.", "error");
        addLog("node:fs:600", "stderr");
        addLog("  handleError(ENOENT, 'open', path);", "stderr");
        addLog("container@vortex~ Process terminated with code 1 (Crashed)", "stderr");
      }, 1200);
      return;
    }

    // Standard Clean Run
    addLog("[VortexBot] Starting database nodes...", "stdout");
    addLog(`[VortexBot] Config loaded. Target: ${activeContainer.name}`, "stdout");

    if (activeContainer.id === "whatsapp-node") {
      executionTimer.current = setTimeout(() => {
        addLog("[VortexBot] Generating authentication QR code for WhatsApp...", "info");
        setContainers((prev) =>
          prev.map((c) => (c.id === selectedContainerId ? { ...c, showQrCode: true } : c))
        );

        executionTimer.current = setTimeout(() => {
          setContainers((prev) =>
            prev.map((c) => (c.id === selectedContainerId ? { ...c, showQrCode: false } : c))
          );
          addLog("[VortexBot] Pairing complete! Logged in securely.", "success");
          addLog("[VortexBot] Active thread pool running on thread #1.", "success");
        }, 5000);
      }, 2000);
    } else {
      executionTimer.current = setTimeout(() => {
        addLog("[VortexBot] Feed pipelines synchronized.", "success");
        addLog("[VortexBot] Scrapers listening for webhook broadcasts...", "success");
      }, 2000);
    }
  };

  const stopServerContainer = () => {
    if (executionTimer.current) clearTimeout(executionTimer.current);
    setContainers((prev) =>
      prev.map((c) =>
        c.id === selectedContainerId
          ? { ...c, status: "OFFLINE", showQrCode: false }
          : c
      )
    );
    addLog("container@vortex~ Stopping container process...", "system");
    addLog("container@vortex~ Server marked as OFFLINE.", "system");
  };

  const killServerContainer = () => {
    if (executionTimer.current) clearTimeout(executionTimer.current);
    setContainers((prev) =>
      prev.map((c) =>
        c.id === selectedContainerId
          ? { ...c, status: "OFFLINE", showQrCode: false }
          : c
      )
    );
    addLog("container@vortex~ SIGKILL signal dispatched.", "stderr");
    addLog("container@vortex~ Server marked as OFFLINE.", "system");
  };

  const restartServerContainer = () => {
    stopServerContainer();
    setTimeout(() => {
      startServerContainer();
    }, 1000);
  };

  const handleActionClick = (action: "START" | "STOP" | "KILL" | "RESTART" | "INSTALL") => {
    if (action === "START") startServerContainer();
    if (action === "INSTALL") installContainerDependencies();
    if (action === "STOP") stopServerContainer();
    if (action === "KILL") killServerContainer();
    if (action === "RESTART") restartServerContainer();
  };

  // Shell command prompt parsing
  const handleTerminalCommand = (cmd: string) => {
    if (!activeContainer) return;
    const trimmed = cmd.toLowerCase().trim();
    addLog(`container@vortex~ ${cmd}`, "stdout");

    if (trimmed === "help") {
      addLog("VORTEX SHELL SYSTEM UTILITIES", "info");
      addLog("------------------------------------", "info");
      addLog("  help           - Display active command list", "info");
      addLog("  npm install    - Synchronize node dependency trees", "info");
      addLog("  npm start      - Execute startup code module", "info");
      addLog("  clear          - Flush console log buffers", "info");
      addLog("  ls             - Inspect directory indexes", "info");
      addLog("  restart        - Bounce server processes", "info");
    } else if (trimmed === "clear") {
      clearLogs();
    } else if (trimmed === "ls") {
      addLog("Listing /home/container:", "info");
      activeContainer.files.forEach((f) => {
        addLog(`  ${f.isFolder ? "[DIR]" : "[FILE]"}  ${f.name}   (${f.size || "0 B"})`, "stdout");
      });
    } else if (trimmed === "npm install") {
      installContainerDependencies();
    } else if (trimmed === "npm start" || trimmed === "npm run start") {
      startServerContainer();
    } else if (trimmed === "restart") {
      restartServerContainer();
    } else if (trimmed === "stop") {
      stopServerContainer();
    } else {
      addLog(`vortex-sh: command not found: ${cmd}`, "stderr");
    }
  };

  const handleApplyAIFix = (brokenFile: string, fixedCode: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.name === brokenFile ? { ...f, content: fixedCode, size: "1.1 KB", updatedAt: "AI Restored" } : f
      )
    );
    setContainers((prev) =>
      prev.map((c) =>
        c.id === selectedContainerId
          ? { ...c, errorText: "", status: "OFFLINE" }
          : c
      )
    );
    addLog(`[Vortex AI Diagnostic Hub] Clean code injected into file: ${brokenFile}.`, "success");
    addLog("container@vortex~ Sandbox exception resolved. Execute startup command.", "system");
  };

  const handleSetStatus = (status: Container["status"], errorText: string = "") => {
    setContainers((prev) =>
      prev.map((c) => (c.id === selectedContainerId ? { ...c, status, errorText } : c))
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen text-gray-200 relative select-none font-sans">
        <BackgroundOverlay />
        <AuthGate onSuccess={handleAuthSuccess} />
      </div>
    );
  }

  if (!selectedContainerId || !activeContainer) {
    return (
      <div className="min-h-screen text-gray-200 relative select-none font-sans overflow-y-auto">
        <BackgroundOverlay />
        <ContainerList
          containers={containers}
          onSelect={setSelectedContainerId}
          onAddContainer={handleAddContainer}
          onDeleteContainer={handleDeleteContainer}
          userEmail={user.email}
        />
      </div>
    );
  }

  const activeLogsText = activeContainer.logs.map((l) => `[${l.timestamp}] ${l.text}`).join("\n");

  return (
    <div id="vortex-panel-core-wrapper" className="min-h-screen flex text-gray-200 overflow-x-hidden font-sans select-none">
      
      <BackgroundOverlay />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        username={user.username}
        onBackToContainers={() => setSelectedContainerId(null)}
        onLogout={handleLogout}
        containerName={activeContainer.name}
      />

      {/* Operations Viewport */}
      <div id="main-ops-viewport" className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* Navigation header */}
        <header id="main-navbar-header" className="sticky top-0 z-30 flex items-center justify-between border-b border-white/5 bg-[#07070a]/85 px-6 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              id="mobile-sidebar-toggle"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-purple-400 hover:bg-white/5 hover:text-white lg:hidden cursor-pointer"
            >
              <Menu size={18} />
            </button>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  activeContainer.status === "RUNNING" ? "bg-emerald-400 animate-ping" : ""
                }`} />
                <span className={`relative inline-flex h-2 w-2 rounded-full ${
                  activeContainer.status === "RUNNING" ? "bg-emerald-500" :
                  activeContainer.status === "INSTALLING" ? "bg-amber-400" :
                  activeContainer.status === "CRASHED" ? "bg-rose-500" : "bg-gray-500"
                }`} />
              </span>
              <h2 className="text-xs font-black tracking-widest uppercase text-white font-mono">
                {activeContainer.id} // vps-virtual-node
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider text-gray-500 font-bold uppercase">
            <Terminal size={12} className="text-purple-400" />
            <span>Virtual Console Active</span>
          </div>
        </header>

        {/* Content Split Pane Layout */}
        <main id="main-content-split-pane" className="flex-1 p-4 lg:p-6 space-y-6 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-6 overflow-y-auto">
          
          {/* Active Task (Left Grid) */}
          <div id="active-work-panel" className="lg:col-span-8 space-y-4">
            
            {/* Real Code Scanner instead of scenario-lab */}
            <CodeScanner
              container={activeContainer}
              isInstalled={!!activeContainer.isInstalled}
              onAutoInstall={installContainerDependencies}
              onSetStatus={handleSetStatus}
              addLog={addLog}
            />

            {/* Rendering matching navigation page */}
            {activeTab === "console" && (
              <ConsoleTab
                stats={activeContainer.stats}
                setStats={() => {}}
                logs={activeContainer.logs}
                setLogs={() => {}}
                onCommand={handleTerminalCommand}
                onActionClick={handleActionClick}
                showQrCode={activeContainer.showQrCode}
                isHealed={activeContainer.errorText.length === 0}
                isInstalled={!!activeContainer.isInstalled}
              />
            )}

            {activeTab === "files" && (
              <FilesTab
                files={activeContainer.files}
                setFiles={setFiles}
                onFileChange={() => {
                  // File change automatically resets error flags to let the code scanner evaluate again
                  setContainers((prev) =>
                    prev.map((c) => (c.id === selectedContainerId ? { ...c, errorText: "" } : c))
                  );
                }}
              />
            )}

            {activeTab === "startup" && (
              <StartupTab
                variables={activeContainer.variables}
                setVariables={setVariables}
                startupCommand={activeContainer.startupCommand}
                setStartupCommand={setStartupCommand}
                qwenKey={qwenKey}
                setQwenKey={handleSaveQwenKey}
              />
            )}

            {activeTab === "network" && <NetworkTab />}

            {activeTab === "metrics" && <MetricsTab stats={activeContainer.stats} />}

            {["databases", "schedules", "backups", "users", "settings", "activity"].includes(activeTab) && (
              <div className="rounded-2xl border border-white/5 bg-[#0e0e13]/80 p-12 text-center space-y-4 max-w-md mx-auto">
                <h4 className="text-xs font-black uppercase tracking-widest text-purple-400">
                  Virtualization Gated
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Backup registries, scheduled cron nodes, and users metrics are isolated inside your secure VPS hosting partition. Access console and files tools to launch custom scripts.
                </p>
                <button
                  onClick={() => setActiveTab("console")}
                  className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-black uppercase text-white hover:bg-purple-500 transition-colors cursor-pointer"
                >
                  Return to Console
                </button>
              </div>
            )}

          </div>

          {/* AI Self-Healer Diagnostic Hub */}
          <div id="ai-diagnostics-deck" className="lg:col-span-4">
            <AIDiagnostics
              logs={activeLogsText}
              files={activeContainer.files}
              errorText={activeContainer.errorText}
              qwenKey={qwenKey}
              setFiles={setFiles}
              onApplyFix={handleApplyAIFix}
              status={activeContainer.status}
            />
          </div>

        </main>
      </div>

    </div>
  );
}
