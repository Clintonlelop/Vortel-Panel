import React, { useState, useEffect, useRef, useCallback } from "react";
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
import ErrorBoundary from "./components/ErrorBoundary";

import { defaultFiles } from "./data/defaultFiles";
import { BotFile, ServerStats, ConsoleLog, StartupVariable, Container, User } from "./types";
import { formatBytes } from "./utils/format";

const AUTH_KEY = "vortex_auth_user";
const CONTAINERS_KEY = "vortex_containers_data_v3";
const QWEN_KEY_NAME = "vortex_qwen_api_key";

const MAX_LOGS = 500;
const PERSIST_DEBOUNCE_MS = 2000;

// ---------- Safe storage helpers (never crash on corrupt data / quota) ----------

function safeGet<T>(key: string, fallback: T, validate?: (value: unknown) => boolean): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    if (validate && !validate(parsed)) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota errors are intentionally non-fatal
  }
}

// ---------- Simulation helpers ----------

function makeEmptyStats(): ServerStats {
  return { status: "OFFLINE", cpu: 0, memory: 0, networkIn: 0, networkOut: 0, uptime: "Offline" };
}

function timestampNow(): string {
  return new Date().toTimeString().split(" ")[0];
}

function makeSeedContainers(): Container[] {
  const t = "18:00:00";
  const container1: Container = {
    id: "whatsapp-node",
    name: "WhatsApp Listener Daemon",
    description: "Primary webhook listener routing chat groups and dynamic responses.",
    status: "OFFLINE",
    stats: makeEmptyStats(),
    logs: [
      { text: "container@vortex~ Host Node initialized successfully.", type: "system", timestamp: t },
      { text: "container@vortex~ Environment Detected: Node.js (package.json present).", type: "info", timestamp: t },
      { text: "container@vortex~ Dependencies not synchronized. Execute 'NPM INSTALL' first.", type: "info", timestamp: t },
    ],
    files: defaultFiles,
    startupCommand: "node index.js",
    variables: [
      { key: "BOT_NAME", value: "VortexBot-WhatsApp", description: "Identity signature on outgoing protocols." },
      { key: "AUTO_REPLY", value: "true", description: "Toggle if the bot responds to common triggers instantly." },
      { key: "PORT", value: "3000", description: "Virtual webserver binding interface." },
    ],
    ports: [{ id: "1", port: 3000, protocol: "TCP", isPrimary: true, status: "ONLINE" }],
    showQrCode: false,
    errorText: "",
    isInstalled: false,
  };

  const container2: Container = {
    id: "telegram-node",
    name: "Telegram Scraper Worker",
    description: "Extracts real-time feeds from designated source channels and indexes events.",
    status: "OFFLINE",
    stats: makeEmptyStats(),
    logs: [
      { text: "container@vortex~ Host Node initialized successfully.", type: "system", timestamp: t },
      { text: "container@vortex~ Environment Detected: Node.js (scraper.js present).", type: "info", timestamp: t },
      { text: "container@vortex~ Modules ready. Execute startup commands.", type: "success", timestamp: t },
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
}`,
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
}, 3000);`,
      },
    ],
    startupCommand: "node scraper.js",
    variables: [
      { key: "TELEGRAM_API_ID", value: "4820934", description: "Credentials hash for access points." },
      { key: "MONITOR_CHANNELS", value: "@crypto_updates", description: "Comma-delimited listen filters." },
    ],
    ports: [{ id: "1", port: 8080, protocol: "TCP", isPrimary: true, status: "ONLINE" }],
    showQrCode: false,
    errorText: "",
    isInstalled: false,
  };

  return [container1, container2];
}

export default function App() {
  // Session user state
  const [user, setUser] = useState<User | null>(() =>
    safeGet<User | null>(
      AUTH_KEY,
      null,
      (v) => typeof v === "object" && v !== null && typeof (v as User).email === "string"
    )
  );

  // Isolated container state list (safe parse + shape validation)
  const [containers, setContainers] = useState<Container[]>(() =>
    safeGet<Container[]>(
      CONTAINERS_KEY,
      makeSeedContainers(),
      (v) =>
        Array.isArray(v) &&
        v.length > 0 &&
        v.every(
          (c) =>
            typeof c?.id === "string" &&
            typeof c?.name === "string" &&
            Array.isArray(c?.files) &&
            Array.isArray(c?.logs) &&
            typeof c?.startupCommand === "string"
        )
    )
  );

  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("console");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Qwen key lives in sessionStorage (cleared when the browser closes) with
  // one-time migration from the legacy localStorage entry.
  const [qwenKey, setQwenKey] = useState<string>(() => {
    try {
      const s = sessionStorage.getItem(QWEN_KEY_NAME);
      if (s !== null) return s;
      const l = localStorage.getItem(QWEN_KEY_NAME);
      if (l !== null) {
        sessionStorage.setItem(QWEN_KEY_NAME, l);
        localStorage.removeItem(QWEN_KEY_NAME);
      }
      return l || "";
    } catch {
      return "";
    }
  });

  // ---- Refs mirroring live state (fixes every stale-closure race) ----
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedContainerId;

  const containersRef = useRef<Container[]>(containers);
  containersRef.current = containers;

  const metricsTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const executionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uptimes = useRef<Record<string, number>>({});

  const setFilesForSelected = useCallback((updater: (files: BotFile[]) => BotFile[]) => {
    const id = selectedIdRef.current;
    if (!id) return;
    setContainers((prev) => prev.map((c) => (c.id === id ? { ...c, files: updater(c.files) } : c)));
  }, []);

  const setVariablesForSelected = useCallback((updater: (vars: StartupVariable[]) => StartupVariable[]) => {
    const id = selectedIdRef.current;
    if (!id) return;
    setContainers((prev) => prev.map((c) => (c.id === id ? { ...c, variables: updater(c.variables) } : c)));
  }, []);

  // ---- Persistence (debounced; volatile stats are stripped before saving) ----
  useEffect(() => {
    const t = setTimeout(() => {
      const persistable = containers.map((c) => ({ ...c, stats: makeEmptyStats() }));
      safeSet(CONTAINERS_KEY, persistable);
    }, PERSIST_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [containers]);

  useEffect(() => {
    if (user) safeSet(AUTH_KEY, user);
    else try { localStorage.removeItem(AUTH_KEY); } catch {}
  }, [user]);

  // ---- Metrics loop (1s tick; single interval for the app lifetime) ----
  useEffect(() => {
    if (metricsTimer.current) clearInterval(metricsTimer.current);

    metricsTimer.current = setInterval(() => {
      setContainers((prev) =>
        prev.map((c) => {
          if (c.status === "RUNNING") {
            uptimes.current[c.id] = (uptimes.current[c.id] || 0) + 1;
            const nextCpu = Math.max(8, Math.min(92, c.stats.cpu + (Math.random() * 10 - 5)));
            return {
              ...c,
              stats: {
                status: "RUNNING" as const,
                cpu: nextCpu,
                memory: 0,
                // 1s interval => bytes-per-tick equals bytes-per-second
                networkIn: Math.floor(Math.random() * 40000) + 1000,
                networkOut: Math.floor(Math.random() * 20000) + 500,
                uptime: formatUptime(uptimes.current[c.id]),
              },
            };
          }
          if (c.status === "INSTALLING") {
            return {
              ...c,
              stats: {
                status: "INSTALLING" as const,
                cpu: 35,
                memory: 0,
                networkIn: 550000,
                networkOut: 6000,
                uptime: "Installing dependencies",
              },
            };
          }
          // OFFLINE / CRASHED: normalize stats once, then leave untouched
          if (c.stats.status !== "OFFLINE") {
            return { ...c, stats: makeEmptyStats() };
          }
          return c;
        })
      );
    }, 1000);

    return () => {
      if (metricsTimer.current) clearInterval(metricsTimer.current);
      metricsTimer.current = null;
    };
  }, []);

  const formatUptime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const handleAuthSuccess = (name: string, email: string) => {
    setUser({ username: name, email });
  };

  const handleLogout = () => {
    if (metricsTimer.current) clearInterval(metricsTimer.current);
    if (executionTimer.current) clearTimeout(executionTimer.current);
    setUser(null);
    setSelectedContainerId(null);
  };

  // ---- Container CRUD ----

  const handleAddContainer = (name: string, description: string) => {
    const id = "custom-" + Math.random().toString(36).slice(2, 11);
    const newContainer: Container = {
      id,
      name,
      description: description || "Custom virtual application runner node",
      status: "OFFLINE",
      stats: makeEmptyStats(),
      logs: [{ text: "container@vortex~ Host Node initialized successfully.", type: "system", timestamp: timestampNow() }],
      files: [
        {
          name: "package.json",
          isFolder: false,
          size: "200 B",
          updatedAt: "Created",
          content: `{ "name": "${id}", "version": "1.0.0", "main": "index.js", "scripts": { "start": "node index.js" }, "dependencies": { "express": "^4.18.2" } }`,
        },
        {
          name: "index.js",
          isFolder: false,
          size: "150 B",
          updatedAt: "Created",
          content: "console.log('Virtual server listening on port 5000...');",
        },
      ],
      startupCommand: "node index.js",
      variables: [{ key: "PORT", value: "5000", description: "Dynamic container allocation port." }],
      ports: [{ id: "1", port: 5000, protocol: "TCP", isPrimary: true, status: "ONLINE" }],
      showQrCode: false,
      errorText: "",
      isInstalled: false,
    };
    setContainers((prev) => [...prev, newContainer]);
  };

  const handleDeleteContainer = (id: string) => {
    delete uptimes.current[id];
    setContainers((prev) => prev.filter((c) => c.id !== id));
    if (selectedIdRef.current === id) setSelectedContainerId(null);
  };

  // ---- Targeted, race-safe updaters ----

  const updateContainer = (id: string, updater: (c: Container) => Container) => {
    setContainers((prev) => prev.map((c) => (c.id === id ? updater(c) : c)));
  };

  const addLogFor = (containerId: string, text: string, type: ConsoleLog["type"] = "stdout") => {
    updateContainer(containerId, (c) => ({
      ...c,
      logs: [...c.logs, { text, type, timestamp: timestampNow() }].slice(-MAX_LOGS),
    }));
  };

  const addLog = (text: string, type: ConsoleLog["type"] = "stdout") => {
    const id = selectedIdRef.current;
    if (!id) return;
    addLogFor(id, text, type);
  };

  const clearLogs = () => {
    const id = selectedIdRef.current;
    if (!id) return;
    updateContainer(id, (c) => ({ ...c, logs: [] }));
  };

  // ---- NPM install pipeline (race-safe: captures containerId at call time) ----

  const installContainerDependencies = useCallback(() => {
    const containerId = selectedIdRef.current;
    if (!containerId) return;
    const container = containersRef.current.find((c) => c.id === containerId);
    if (!container) return;
    if (container.status === "INSTALLING" || container.status === "RUNNING") return;

    updateContainer(containerId, (c) => ({ ...c, status: "INSTALLING" }));
    addLogFor(containerId, "container@vortex~ npm install", "system");
    addLogFor(containerId, "npm info it worked if it ends with ok", "info");
    addLogFor(containerId, "npm info using npm@10.2.0", "info");
    addLogFor(containerId, "npm info using node@v20.9.0", "info");

    // Scan dependencies from the package.json snapshot at call time
    const pkgFile = container.files.find((f) => f.name === "package.json");
    let deps: string[] = ["express"];
    try {
      const parsed = JSON.parse(pkgFile?.content || "{}");
      if (parsed.dependencies) deps = Object.keys(parsed.dependencies);
    } catch {}

    deps.forEach((dep, idx) => {
      setTimeout(() => {
        addLogFor(containerId, `npm http fetch GET 200 https://registry.npmjs.org/${dep} (size: 214KB)`, "stdout");
      }, (idx + 1) * 400);
    });

    setTimeout(() => {
      // Re-read the live file at callback time in case the user edited it
      const target = containersRef.current.find((c) => c.id === containerId);
      const pkgCheck = target?.files.find((f) => f.name === "package.json");
      if (pkgCheck?.content.includes("broken-version-not-found-on-npm")) {
        updateContainer(containerId, (c) => ({
          ...c,
          status: "CRASHED",
          errorText: "NPM package resolution failed. One or more dependencies were not found on the npm registry.",
        }));
        addLogFor(containerId, "npm ERR! 404 Not Found - GET https://registry.npmjs.org/broken-version-not-found-on-npm", "error");
        addLogFor(containerId, "npm ERR! A complete log of this run can be found in /home/container/.npm/_logs", "error");
      } else {
        updateContainer(containerId, (c) => ({ ...c, status: "OFFLINE", isInstalled: true, errorText: "" }));
        addLogFor(containerId, `added ${deps.length} package modules successfully.`, "success");
        addLogFor(containerId, "container@vortex~ Dependencies synchronized. Use 'NPM START' or click 'START BOT' to execute thread.", "system");
      }
    }, deps.length * 400 + 600);
  }, []);

  // ---- Start (race-safe) ----

  const startServerContainer = useCallback(() => {
    const containerId = selectedIdRef.current;
    if (!containerId) return;
    const container = containersRef.current.find((c) => c.id === containerId);
    if (!container) return;
    // Status read from the LIVE ref — this is what fixes the restart bug
    if (container.status === "RUNNING" || container.status === "INSTALLING") return;

    // 1) Dependency gate: derive the missing-module name from the project's own package.json
    if (!container.isInstalled) {
      let firstDep = "dependency";
      try {
        const pkg = JSON.parse(container.files.find((f) => f.name === "package.json")?.content || "{}");
        const depKeys = Object.keys(pkg.dependencies || {});
        if (depKeys.length > 0) firstDep = depKeys[0];
      } catch {}
      const entryName = container.startupCommand.trim().split(/\s+/).pop() || "index.js";

      updateContainer(containerId, (c) => ({
        ...c,
        status: "CRASHED",
        errorText: `Error: Cannot find module '${firstDep}' or its dependencies. Run 'NPM INSTALL' first to synchronize package modules.`,
      }));
      addLogFor(containerId, `container@vortex~ Executing process: ${container.startupCommand}`, "system");
      addLogFor(containerId, "node:internal/modules/cjs/loader:1080", "stderr");
      addLogFor(containerId, "  throw err;", "stderr");
      addLogFor(containerId, "  ^", "stderr");
      addLogFor(containerId, `Error: Cannot find module '${firstDep}'`, "error");
      addLogFor(containerId, "Require stack:", "stderr");
      addLogFor(containerId, ` - /home/container/${entryName}`, "stderr");
      addLogFor(containerId, "container@vortex~ Process terminated with code 1.", "stderr");
      return;
    }

    // 2) Mark RUNNING and clear crash state
    uptimes.current[containerId] = 0;
    updateContainer(containerId, (c) => ({ ...c, errorText: "", showQrCode: false, status: "RUNNING" }));
    addLogFor(containerId, `container@vortex~ Booting process: ${container.startupCommand}`, "system");
    addLogFor(containerId, "[VortexBot] Starting database nodes...", "stdout");
    addLogFor(containerId, `[VortexBot] Config loaded. Target: ${container.name}`, "stdout");

    // 3) Inspect the entry file for scripted crash scenarios
    const entryFileName = container.startupCommand.trim().split(/\s+/).pop() || "index.js";
    const entryFile =
      container.files.find((f) => f.name === entryFileName) ||
      container.files.find((f) => f.name === "index.js");

    if (entryFile && entryFile.content.includes("require('fs'{;")) {
      executionTimer.current = setTimeout(() => {
        updateContainer(containerId, (c) => ({
          ...c,
          status: "CRASHED",
          errorText: `SyntaxError: Unexpected token '{' at /home/container/${entryFileName}:2`,
        }));
        addLogFor(containerId, "internal/modules/cjs/loader.js:818", "stderr");
        addLogFor(containerId, `/home/container/${entryFileName}:2`, "stderr");
        addLogFor(containerId, "const fs = require('fs'{;", "stderr");
        addLogFor(containerId, "                      ^", "stderr");
        addLogFor(containerId, "SyntaxError: Unexpected token '{'", "error");
        addLogFor(containerId, "container@vortex~ Process terminated with code 1 (Crashed)", "stderr");
      }, 1500);
      return;
    }

    if (
      entryFile &&
      entryFile.content.includes("fs.readFileSync('./config.json'") &&
      !container.files.some((f) => f.name === "config.json")
    ) {
      executionTimer.current = setTimeout(() => {
        updateContainer(containerId, (c) => ({
          ...c,
          status: "CRASHED",
          errorText: "Error: ENOENT: no such file or directory, open './config.json'",
        }));
        addLogFor(containerId, "[VortexBot ERROR] Failed to load config.json! File is corrupted or missing.", "error");
        addLogFor(containerId, "node:fs:600", "stderr");
        addLogFor(containerId, "  handleError(ENOENT, 'open', path);", "stderr");
        addLogFor(containerId, "container@vortex~ Process terminated with code 1 (Crashed)", "stderr");
      }, 1200);
      return;
    }

    // 4) Clean run
    if (container.id === "whatsapp-node") {
      executionTimer.current = setTimeout(() => {
        addLogFor(containerId, "[VortexBot] Generating authentication QR code for WhatsApp...", "info");
        updateContainer(containerId, (c) => ({ ...c, showQrCode: true }));

        executionTimer.current = setTimeout(() => {
          updateContainer(containerId, (c) => ({ ...c, showQrCode: false }));
          addLogFor(containerId, "[VortexBot] Pairing complete! Logged in securely.", "success");
          addLogFor(containerId, "[VortexBot] Active thread pool running on thread #1.", "success");
        }, 5000);
      }, 2000);
    } else {
      executionTimer.current = setTimeout(() => {
        addLogFor(containerId, "[VortexBot] Feed pipelines synchronized.", "success");
        addLogFor(containerId, "[VortexBot] Scrapers listening for webhook broadcasts...", "success");
      }, 2000);
    }
  }, []);

  const stopServerContainer = useCallback(() => {
    if (executionTimer.current) clearTimeout(executionTimer.current);
    const id = selectedIdRef.current;
    if (!id) return;
    uptimes.current[id] = 0;
    updateContainer(id, (c) => ({ ...c, status: "OFFLINE", showQrCode: false }));
    addLogFor(id, "container@vortex~ Stopping container process...", "system");
    addLogFor(id, "container@vortex~ Server marked as OFFLINE.", "system");
  }, []);

  const killServerContainer = useCallback(() => {
    if (executionTimer.current) clearTimeout(executionTimer.current);
    const id = selectedIdRef.current;
    if (!id) return;
    uptimes.current[id] = 0;
    updateContainer(id, (c) => ({ ...c, status: "OFFLINE", showQrCode: false }));
    addLogFor(id, "container@vortex~ SIGKILL signal dispatched.", "stderr");
    addLogFor(id, "container@vortex~ Server marked as OFFLINE.", "system");
  }, []);

  const restartServerContainer = useCallback(() => {
    const id = selectedIdRef.current;
    if (!id) return;
    const container = containersRef.current.find((c) => c.id === id);
    if (!container) return;
    if (container.status === "RUNNING") {
      addLogFor(id, "container@vortex~ RESTART: stopping process...", "system");
      if (executionTimer.current) clearTimeout(executionTimer.current);
      uptimes.current[id] = 0;
      updateContainer(id, (c) => ({ ...c, status: "OFFLINE", showQrCode: false }));
    }
    setTimeout(() => {
      // Abort if the user switched containers while restarting
      if (selectedIdRef.current !== id) return;
      addLogFor(id, "container@vortex~ RESTART: booting process...", "system");
      startServerContainer();
    }, 1000);
  }, [startServerContainer]);

  const handleActionClick = (action: "START" | "STOP" | "KILL" | "RESTART" | "INSTALL") => {
    if (action === "START") startServerContainer();
    if (action === "INSTALL") installContainerDependencies();
    if (action === "STOP") stopServerContainer();
    if (action === "KILL") killServerContainer();
    if (action === "RESTART") restartServerContainer();
  };

  // ---- Terminal command parsing ----

  const handleTerminalCommand = (cmd: string) => {
    const id = selectedIdRef.current;
    if (!id) return;
    const container = containersRef.current.find((c) => c.id === id);
    if (!container) return;

    const trimmed = cmd.toLowerCase().trim();
    addLogFor(id, `container@vortex~ ${cmd}`, "stdout");

    if (trimmed === "help") {
      addLogFor(id, "VORTEX SHELL SYSTEM UTILITIES", "info");
      addLogFor(id, "------------------------------------", "info");
      addLogFor(id, "  help           - Display active command list", "info");
      addLogFor(id, "  npm install    - Synchronize node dependency trees", "info");
      addLogFor(id, "  npm start      - Execute startup code module", "info");
      addLogFor(id, "  clear          - Flush console log buffers", "info");
      addLogFor(id, "  ls             - Inspect directory indexes", "info");
      addLogFor(id, "  restart        - Bounce server processes", "info");
      addLogFor(id, "  stop           - Stop the running container", "info");
    } else if (trimmed === "clear") {
      clearLogs();
    } else if (trimmed === "ls") {
      addLogFor(id, "Listing /home/container:", "info");
      container.files.forEach((f) => {
        addLogFor(id, `  ${f.isFolder ? "[DIR]" : "[FILE]"}  ${f.name}   (${f.size || "0 B"})`, "stdout");
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
      addLogFor(id, `vortex-sh: command not found: ${cmd}`, "stderr");
    }
  };

  // ---- AI fix application (honest: verifies the target file exists) ----

  const handleApplyAIFix = (brokenFile: string, fixedCode: string) => {
    const id = selectedIdRef.current;
    if (!id) return;
    const target = containersRef.current.find((c) => c.id === id);
    if (!target) return;

    // Models often return paths ("src/index.js"); compare basenames
    const normalize = (s: string) => s.split("/").pop()?.trim() || s;
    const file = target.files.find((f) => !f.isFolder && normalize(f.name) === normalize(brokenFile));

    if (!file) {
      addLogFor(id, `[Vortex AI] Could not locate a file matching '${brokenFile}'. No changes applied.`, "error");
      addLogFor(id, "container@vortex~ Sandbox exception persists. Review the proposed fix manually.", "system");
      return;
    }

    const wasPackageJson = file.name.toLowerCase() === "package.json";
    updateContainer(id, (c) => ({
      ...c,
      files: c.files.map((f) =>
        f.name === file.name
          ? { ...f, content: fixedCode, size: formatBytes(new Blob([fixedCode]).size), updatedAt: "AI Restored" }
          : f
      ),
      // Replaced package.json => installed node_modules no longer match
      isInstalled: wasPackageJson ? false : c.isInstalled,
      status: "OFFLINE",
      errorText: "",
    }));

    addLogFor(id, `[Vortex AI Diagnostic Hub] Clean code injected into file: ${file.name}.`, "success");
    if (wasPackageJson) {
      addLogFor(id, "container@vortex~ package.json changed. Re-run 'NPM INSTALL' before starting.", "system");
    } else {
      addLogFor(id, "container@vortex~ Sandbox exception resolved. Execute startup command.", "system");
    }
  };

  const handleSetStatus = (status: Container["status"], errorText: string = "") => {
    const id = selectedIdRef.current;
    if (!id) return;
    updateContainer(id, (c) => ({ ...c, status, errorText }));
  };

  const handleSaveQwenKey = (newKey: string) => {
    setQwenKey(newKey);
    try {
      sessionStorage.setItem(QWEN_KEY_NAME, newKey);
    } catch {}
  };

  // ---- Derived state ----

  const activeContainer = containers.find((c) => c.id === selectedContainerId) || null;

  const handleFileChange = (packageJsonChanged?: boolean) => {
    const id = selectedIdRef.current;
    if (!id) return;
    // Any file change clears the crash flag so the scanner can re-evaluate.
    // A package.json edit also invalidates the installed node_modules snapshot.
    updateContainer(id, (c) => ({
      ...c,
      errorText: "",
      isInstalled: packageJsonChanged ? false : c.isInstalled,
    }));
  };

  const activeLogsText = activeContainer
    ? activeContainer.logs.map((l) => `[${l.timestamp}] ${l.text}`).join("\n").slice(-60000)
    : "";

  // ---- Render ----

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

  return (
    <ErrorBoundary>
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
                aria-label="Open navigation menu"
                className="rounded-lg p-2 text-purple-400 hover:bg-white/5 hover:text-white lg:hidden cursor-pointer"
              >
                <Menu size={18} />
              </button>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${activeContainer.status === "RUNNING" ? "bg-emerald-400 animate-ping" : ""}`} />
                  <span
                    className={`relative inline-flex h-2 w-2 rounded-full ${
                      activeContainer.status === "RUNNING"
                        ? "bg-emerald-500"
                        : activeContainer.status === "INSTALLING"
                        ? "bg-amber-400"
                        : activeContainer.status === "CRASHED"
                        ? "bg-rose-500"
                        : "bg-gray-500"
                    }`}
                  />
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
              <CodeScanner
                container={activeContainer}
                isInstalled={!!activeContainer.isInstalled}
                onAutoInstall={installContainerDependencies}
                onSetStatus={handleSetStatus}
                addLog={addLog}
              />

              {activeTab === "console" && (
                <ConsoleTab
                  stats={activeContainer.stats}
                  logs={activeContainer.logs}
                  onCommand={handleTerminalCommand}
                  onActionClick={handleActionClick}
                  showQrCode={activeContainer.showQrCode}
                  isInstalled={!!activeContainer.isInstalled}
                />
              )}

              {activeTab === "files" && (
                <FilesTab
                  files={activeContainer.files}
                  setFiles={setFilesForSelected}
                  onFileChange={handleFileChange}
                />
              )}

              {activeTab === "startup" && (
                <StartupTab
                  variables={activeContainer.variables}
                  setVariables={setVariablesForSelected}
                  startupCommand={activeContainer.startupCommand}
                  setStartupCommand={(cmd) => {
                    const id = selectedIdRef.current;
                    if (!id) return;
                    updateContainer(id, (c) => ({ ...c, startupCommand: cmd }));
                  }}
                  qwenKey={qwenKey}
                  setQwenKey={handleSaveQwenKey}
                />
              )}

              {activeTab === "network" && (
                <NetworkTab
                  ports={activeContainer.ports}
                  setPorts={(updater) => {
                    const id = selectedIdRef.current;
                    if (!id) return;
                    updateContainer(id, (c) => ({ ...c, ports: updater(c.ports) }));
                  }}
                />
              )}

              {activeTab === "metrics" && <MetricsTab stats={activeContainer.stats} />}

              {["databases", "schedules", "backups", "users", "settings", "activity"].includes(activeTab) && (
                <div className="rounded-2xl border border-white/5 bg-[#0e0e13]/80 p-12 text-center space-y-4 max-w-md mx-auto">
                  <h4 className="text-xs font-black uppercase tracking-widest text-purple-400">Virtualization Gated</h4>
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
                onApplyFix={handleApplyAIFix}
                status={activeContainer.status}
              />
            </div>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}
