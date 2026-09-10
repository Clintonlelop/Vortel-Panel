# Vortex Panel — Bot Deployment & Diagnostics Hub

A high-performance, self-contained **server container manager** for bot deployments featuring an automated terminal pipeline, secure in-browser file editing, and intelligent **AI diagnostic self-healing** (Gemini / Qwen).

- **Frontend:** React 19 + Vite + Tailwind CSS v4 (dark "Vortex" cyber theme)
- **Backend:** Node.js + Express (single server serves both API and the built frontend)
- **AI:** Google Gemini (`@google/genai`) with optional per-request Qwen (DashScope) key

---

## 1. Requirements

- Ubuntu 20.04+ (or any Debian-based Linux VPS)
- **Node.js 18 or newer** — check with `node -v`

<details>
<summary>How to install Node.js 20 (if you don't have it)</summary>

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

</details>

---

## 2. Get the code onto your VPS

```bash
# Option A: clone from GitHub (replace with your repo URL)
git clone https://github.com/YOUR_USERNAME/vortex-panel.git
cd vortex-panel

# Option B: no git — upload the project folder with SFTP/SCP, then:
cd /path/to/vortex-panel
```

## 3. Install dependencies

```bash
npm install
```

## 4. Create and configure the `.env` file

The AI diagnostics need one secret: a **Gemini API key** (free at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)).

Create the file:

```bash
nano .env
```

Paste this (replace the placeholder with your real key), then save with `Ctrl+O`, `Enter`, `Ctrl+X`:

```ini
GEMINI_API_KEY=your_real_gemini_key_here
PORT=3000
HOST=0.0.0.0
```

**Optional but recommended on a public VPS** — require a token for the AI endpoint and rate-limit it:

```ini
VORTEX_API_TOKEN=paste_a_long_random_string_here
RATE_LIMIT_MAX=20
RATE_LIMIT_WINDOW_MS=60000
```

> Generate a strong token with: `openssl rand -hex 32`
> If `VORTEX_API_TOKEN` is set, the panel will ask each visitor for it — see "Using the API token" below.

<details>
<summary>All supported environment variables</summary>

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `GEMINI_API_KEY` | yes (for AI heal) | — | Google Gemini key for the AI Self-Healer |
| `VORTEX_API_TOKEN` | no | — | When set, `/api/diagnose` requires `Authorization: Bearer <token>` |
| `QWEN_API_KEY` | no | — | Server-side Qwen fallback (users' own keys in the panel take priority) |
| `PORT` | no | `3000` | HTTP port the server listens on |
| `HOST` | no | `0.0.0.0` | Bind address — keep `0.0.0.0` on a VPS |
| `RATE_LIMIT_MAX` | no | `20` | Max `/api/diagnose` calls per window per IP |
| `RATE_LIMIT_WINDOW_MS` | no | `60000` | Rate-limit window in milliseconds |

</details>

## 5. Build the production bundle

```bash
npm run build
```

This creates `dist/` containing the compiled frontend **and** the bundled Express server (`dist/server.cjs`).

## 6. Start it in production

```bash
npm run start
```

You should see: `Vortex Panel server running on http://0.0.0.0:3000 (mode: production)`.

Open `http://YOUR_VPS_IP:3000` in a browser to verify. The app's login screen is a local session gate — any email/password creates a local sandbox session (no external accounts involved).

### About the API token (only relevant if you set `VORTEX_API_TOKEN`)

The token gate protects `/api/diagnose` for **direct API / automation** use:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" \
     -d '{"logs":"...", "files":{"index.js":"console.log(1)"}}' \
     http://localhost:3000/api/diagnose
```

The panel's built-in UI does not send this header, so if you need the AI Self-Healer button to work from the browser, leave `VORTEX_API_TOKEN` empty. The endpoint is still protected by rate limiting in that case.

## 7. Keep it running after you disconnect (PM2)

Do NOT run `npm run start` for long-term hosting — if SSH disconnects, the app dies. Use **PM2**:

```bash
sudo npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save          # remember the running process list
pm2 startup       # follow the printed command to enable start-on-boot
```

PM2 restarts the app automatically if it crashes or if the VPS reboots.

## 8. Restart / stop / check status

```bash
pm2 restart vortex-panel   # restart after code changes
pm2 stop vortex-panel      # stop the app
pm2 status                 # list all PM2 apps
```

## 9. View logs

```bash
pm2 logs vortex-panel            # live log stream (Ctrl+C to exit)
cat logs/vortex-out.log          # stdout history
cat logs/vortex-error.log        # error history
```

## 10. (Optional) Use a domain with Nginx as a reverse proxy

1. Point your domain's **A record** at your VPS IP (at your domain registrar).
2. Install Nginx: `sudo apt-get install -y nginx`
3. Create the site config:

```bash
sudo nano /etc/nginx/sites-available/vortex-panel
```

Paste (replace `yourdomain.com`):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
```

Enable it and reload:

```bash
sudo ln -s /etc/nginx/sites-available/vortex-panel /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

4. **Free HTTPS** with Let's Encrypt:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## 11. Firewall / ports

The app itself must stay **internal** when behind Nginx. Open only what you need:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'    # 80 + 443 for the reverse proxy
sudo ufw enable
```

Running **without** Nginx (direct IP access)? Open the app port instead:

```bash
sudo ufw allow 3000/tcp
```

Never open ports you don't use.

## 12. Health check

The server exposes a health endpoint you can use for uptime monitors:

```bash
curl http://localhost:3000/api/health
# {"status":"ok","uptimeSec":12,...}
```

---

## Local development

```bash
npm install
npm run dev     # Vite dev server with the API on the same port (default 3000)
```

## Project structure

```
server.ts                 Express server: API + static hosting + AI diagnostics
src/                      React frontend (Vortex Panel UI)
src/components/           Panel tabs (Console, Files, Startup, Network, Metrics, AI)
ecosystem.config.cjs      PM2 process config for production
dist/                     Build output (generated, gitignored)
```
