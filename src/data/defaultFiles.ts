import { BotFile } from "../types";

export const defaultFiles: BotFile[] = [
  {
    name: "package.json",
    isFolder: false,
    size: "348 B",
    updatedAt: "Just Now",
    content: `{
  "name": "vortex-bot",
  "version": "1.0.0",
  "description": "WhatsApp and Telegram utility assistant",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "qrcode-terminal": "^0.12.0"
  }
}`
  },
  {
    name: "index.js",
    isFolder: false,
    size: "1.2 KB",
    updatedAt: "Just Now",
    content: `// VORTEX BOT v1.0.0 ENTRY POINT
const fs = require('fs');
const qrcode = require('qrcode-terminal');

console.log('[VortexBot] Starting initialization...');

// Load configurations
try {
  const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
  console.log('[VortexBot] Config loaded for bot: ' + config.botName);
} catch (err) {
  console.error('[VortexBot ERROR] Failed to load config.json! File is corrupted.');
  process.exit(1);
}

// WhatsApp connection simulation
console.log('[VortexBot] Connecting to WhatsApp Web servers...');

setTimeout(() => {
  console.log('[VortexBot] Generating QR Code for WhatsApp Web pairing...');
  console.log('[QR_CODE_TRIGGER_START]');
  console.log('[VortexBot] Scan the QR code below to connect your device.');
  
  // Simulated QR Code
  console.log('   █▀▀▀▀▀█ ▄▄█▄▄ █▀▀▀▀▀█   ');
  console.log('   █ ███ █ ▀█▄▀▄ █ ███ █   ');
  console.log('   █ ▀▀▀ █  █ ▀█ █ ▀▀▀ █   ');
  console.log('   ▀▀▀▀▀▀▀ ▀ █ ▀ ▀▀▀▀▀▀▀   ');
  console.log('   ▀ ▄▀▀▀▀▄▄▄▄ ▀▄ ▄▀▄█▀▀   ');
  console.log('   █▄█▀█ █ █▀▀██▀▀█▀  ▀█   ');
  console.log('   █ ▀  ▀▀▀██▀█▀█  ▀▄▄▀▄   ');
  console.log('   ▀▀  ▀▀▀ █▀  ▀▀▀ ▀   ▀   ');
  
  setTimeout(() => {
    console.log('[QR_CODE_TRIGGER_END]');
    console.log('[VortexBot] Authentication successful! Logged in as +234 815 489 5092');
    console.log('[VortexBot] Bot is active and listening for trigger commands...');
  }, 4000);

}, 2000);
`
  },
  {
    name: "config.json",
    isFolder: false,
    size: "124 B",
    updatedAt: "Just Now",
    content: `{
  "botName": "VortexBot-Alpha",
  "prefix": "!",
  "autoReply": true,
  "maxConnections": 50
}`
  },
  {
    name: ".env",
    isFolder: false,
    size: "95 B",
    updatedAt: "Just Now",
    content: `API_TOKEN=vortex_tok_92813084
PORT=3000
DEBUG_MODE=true`
  },
  {
    name: "README.md",
    isFolder: false,
    size: "450 B",
    updatedAt: "Just Now",
    content: `# Vortex Bot Hosting Guide

Welcome to your **VORTEX PANEL** container!

## Quick Actions
- Click **NPM Install** to install dependencies from \`package.json\`.
- Click **NPM Start** (or "Start" button) to deploy the bot.
- If the bot crashes, use the **Vortex AI Auto-Healer** on the right side of the screen to diagnose logs and rewrite the broken files instantly!
`
  },
  {
    name: "lib",
    isFolder: true,
    size: "--",
    updatedAt: "Just Now",
    content: ""
  },
  {
    name: "media",
    isFolder: true,
    size: "--",
    updatedAt: "Just Now",
    content: ""
  }
];
