export interface BotFile {
  name: string;
  // Folder path relative to /home/container ("" or undefined = root).
  // Enables real directory navigation instead of a flat, visual-only listing.
  path?: string;
  content: string;
  isFolder: boolean;
  size?: string;
  updatedAt?: string;
}

export interface ServerStats {
  status: "OFFLINE" | "INSTALLING" | "RUNNING" | "CRASHED" | "HEALED";
  cpu: number;
  memory: number; // in MiB
  networkIn: number; // in Bytes
  networkOut: number; // in Bytes
  uptime: string;
}

export interface StartupVariable {
  key: string;
  value: string;
  description: string;
  isSecret?: boolean;
}

export interface NetworkPort {
  id: string;
  port: number;
  protocol: "TCP" | "UDP";
  isPrimary: boolean;
  status: "ONLINE" | "OFFLINE";
}

export interface DiagnosticResult {
  errorAnalysis: string;
  brokenFileName: string;
  fixedContent: string;
  explanation: string;
}

export interface ConsoleLog {
  text: string;
  type: "system" | "stdout" | "stderr" | "success" | "info" | "error";
  timestamp: string;
}

export interface Container {
  id: string;
  name: string;
  description: string;
  status: "OFFLINE" | "INSTALLING" | "RUNNING" | "CRASHED" | "HEALED";
  stats: ServerStats;
  logs: ConsoleLog[];
  files: BotFile[];
  variables: StartupVariable[];
  startupCommand: string;
  ports: NetworkPort[];
  showQrCode: boolean;
  errorText: string;
  isInstalled?: boolean;
}

export interface User {
  username: string;
  email: string;
}

