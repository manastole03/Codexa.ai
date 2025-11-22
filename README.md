# Codexa.ai  🤖🤖

> **Codexa.ai** is a realtime collaborative code editor for the web. Teams can create rooms, write code together with low latency, and switch between 63 editor themes and 21 language modes—right in the browser.

**Live App:** https://code-sync-qq8w.onrender.com/

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-black?logo=express&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-4-010101?logo=socketdotio&logoColor=white)
![CodeMirror](https://img.shields.io/badge/CodeMirror-6-ff4785)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Screenshots](#screenshots)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Development](#local-development)
  - [Environment Variables](#environment-variables)
  - [NPM Scripts](#npm-scripts)
- [Docker (Optional)](#docker-optional)
- [Production Build & Deployment](#production-build--deployment)
- [Project Structure](#project-structure)
- [Realtime Collaboration Model](#realtime-collaboration-model)
- [Theme & Language Support](#theme--language-support)
- [Security Notes](#security-notes)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- ✅ **Realtime Collaborative Editing** powered by **Socket.io**
- 🧠 **21 programming languages** with syntax highlighting (CodeMirror 6)
- 🎨 **63 editor themes** (light/dark & high-contrast options)
- 📱 **Responsive UI** across desktop/tablet/mobile
- 🔁 **Room-based sessions** with presence indicators
- 🔔 **Toasts & UX feedback** via `react-hot-toast`
- 🔗 **Link sharing** to invite collaborators
- ♻️ **State management** with Recoil
- 🔐 **Environment-based config** for client/server

---

## Screenshots

<img width="1919" height="910" alt="image" src="https://github.com/user-attachments/assets/4515ac6b-a541-441e-8edf-58ecd4adafcf" />

<img width="1919" height="904" alt="image" src="https://github.com/user-attachments/assets/cdc76c83-1a51-4b66-a4a1-edfc70980620" />

<img width="1919" height="904" alt="image" src="https://github.com/user-attachments/assets/5c6731ef-c246-4947-afd7-ef5868631d97" />

<img width="1919" height="904" alt="image" src="https://github.com/user-attachments/assets/b3c2c5f3-beac-49cd-bcff-ada8b8b2a716" />

<img width="1919" height="904" alt="image" src="https://github.com/user-attachments/assets/7dd5da6e-f65c-4cdb-87be-d27d79993fc0" />

<img width="1919" height="907" alt="image" src="https://github.com/user-attachments/assets/3773b948-d5f9-4e39-82e5-e93c21cf09c8" />

---

## Tech Stack

**Frontend**
- React, Recoil
- CodeMirror 6
- react-router
- axios
- react-hot-toast

**Backend**
- Node.js (Express.js)
- Socket.io (websockets)
- (Stateless API; room/memory stored in-process or via adapter—see Docker notes)

---

## Architecture

```text
client (React)
├─ UI (React + Tailwind/ styles)
├─ State (Recoil)
├─ Editor (CodeMirror: languages/themes)
└─ Socket client (join room, broadcast ops)

server (Node + Express + Socket.io)
├─ REST (health/config)
├─ Socket namespace /rooms
└─ Collaboration hub (broadcast edits, cursor, theme/lang)
```

**Flow**
1. User creates or joins a room.
2. Client connects to Socket.io namespace with `roomId`.
3. Client emits local changes; server broadcasts to other peers.
4. Editor state updates in realtime for all clients.

---

## Getting Started

### Prerequisites
- **Node.js** v18+ and **npm** v9+ (or **pnpm/yarn**)
- **Git**
- (Optional) **Docker** 24+

### Local Development

Clone and install:

```bash
git clone <your-repo-url> codexa.ai
cd codexa.ai

# install deps
npm run install:all
# or run separately:
# (cd client && npm i) && (cd server && npm i)

# start both client and server in dev
npm run dev
```

**Frontend dev server:** `http://localhost:5173` (Vite default) or `http://localhost:3000` if CRA  
**Backend server:** `http://localhost:4000`  
**Socket endpoint:** `ws://localhost:4000` (path `/socket.io`)

> If your ports differ, update the env files below.

### Environment Variables

Create **two** `.env` files using these examples.

**`/client/.env`**
```env
# Vite-style env vars must start with VITE_
VITE_APP_NAME=Codexa.ai
VITE_API_BASE_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
VITE_DEFAULT_THEME=one-dark
VITE_DEFAULT_LANGUAGE=javascript
```

**`/server/.env`**
```env
# Server
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
# If deploying behind a proxy/CDN, add a comma-separated list:
# CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
API_KEY=<API Key>
SITE_URL=<Site URL>
SITE_NAME=<Site Name>
MODEL=<Model_Name>
```

> In production, set `NODE_ENV=production` and update CORS origins to your deployed frontend.

### NPM Scripts

**At repo root (`package.json`):**
```json
{
  "scripts": {
    "install:all": "npm --prefix client i && npm --prefix server i",
    "dev": "concurrently \"npm:dev:client\" \"npm:dev:server\"",
    "dev:client": "npm --prefix client run dev",
    "dev:server": "npm --prefix server run dev",
    "build": "npm --prefix client run build && npm --prefix server run build",
    "start": "npm --prefix server run start",
    "lint": "npm --prefix client run lint && npm --prefix server run lint",
    "format": "npm --prefix client run format && npm --prefix server run format"
  },
  "devDependencies": {
    "concurrently": "^9.0.0"
  }
}
```

**Client scripts (suggested)**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext .ts,.tsx,.js,.jsx",
    "format": "prettier --write \"src/**/*.{ts,tsx,js,jsx,css,md}\""
  }
}
```

---

## Docker (Optional)

```yaml
# docker-compose.yml
version: "3.9"
services:
  server:
    build: ./server
    ports:
      - "4000:4000"
    env_file:
      - ./server/.env
    environment:
      - NODE_ENV=production
    networks:
      - codexa
  client:
    build: ./client
    ports:
      - "5173:5173"
    env_file:
      - ./client/.env
    environment:
      - NODE_ENV=production
    depends_on:
      - server
    networks:
      - codexa
networks:
  codexa:
    driver: bridge
```

---

## Production Build & Deployment

1. **Build**
   ```bash
   npm run build
   ```
2. **Run server**
   ```bash
   npm run start
   ```
3. **Serve client** on any static host/CDN (Netlify, Vercel, S3+CloudFront, Nginx).

> For large rooms / many users, consider a **Socket.io Redis adapter** and sticky sessions.

---

## Project Structure

```text
codexa.ai/
├─ client/
│  ├─ src/
│  │  ├─ components/
│  │  ├─ editor/            # CodeMirror setup (languages/themes/extensions)
│  │  ├─ hooks/
│  │  ├─ recoil/            # atoms/selectors
│  │  ├─ routes/            # react-router pages
│  │  ├─ services/          # axios client
│  │  └─ main.tsx
│  ├─ index.html
│  └─ package.json
├─ server/
│  ├─ src/
│  │  ├─ index.js           # express + socket.io bootstrap
│  │  ├─ sockets.js         # socket handlers
│  │  ├─ rooms.js           # room registry / utils
│  │  └─ health.js          # healthcheck route
│  └─ package.json
├─ docker-compose.yml
└─ README.md
```

---

## Realtime Collaboration Model

```ts
// client -> server
"room:join"         // { roomId, username }
"editor:change"     // { roomId, delta }  // minimal change payload
"cursor:update"     // { roomId, userId, cursor }
"state:request"     // ask for current document state

// server -> clients
"room:joined"       // participant list, ack
"editor:apply"      // broadcast changes from others
"cursor:broadcast"  // presence / selections
"state:sync"        // current full document snapshot
"toast:error"       // user-friendly errors
```

---

## Theme & Language Support

- **Languages (21)**: e.g., JavaScript/TypeScript, Python, Java, C/C++, Go, Rust, PHP, Ruby, C#, Kotlin, Swift, HTML, CSS, JSON, YAML, Markdown, SQL, Shell, etc. (via CodeMirror 6)
- **Themes (63)**: popular light/dark sets (One Dark/Light, Dracula, Solarized, Monokai, and more). Preferences persist in local storage.

---

## Security Notes

- Configure **CORS** to allowed origins only.
- Validate room IDs and payload shapes—never trust client input.
- If enabling persistence, sanitize stored code and use parameterized DB queries.
- Apply **rate limiting** on REST endpoints (e.g., `/health`) if publicly exposed.
- When deploying behind a proxy, set `app.set('trust proxy', 1)` and use secure cookies (if introduced later).

---

## Troubleshooting

- **Build minification issues (CRA):**  
  This section has moved here:  
  https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify

- **Sockets not connecting locally**
  - Check `VITE_SOCKET_URL` and server `PORT`.
  - Ensure CORS on server allows your client origin.

- **Edits feel laggy**
  - Debounce/throttle `editor:change` emits.
  - Ensure the socket instance isn’t recreated each render.

---

## Roadmap

- Document history & versioning  
- Commenting & inline annotations  
- Presence avatars & typing indicators  
- Auth & private rooms  
- Redis adapter for horizontal scaling  
- Persistence (DB) for saved files/snippets  

---

## Contributing

1. Fork the repo and create a feature branch.
2. Run `npm run dev` and ensure lint passes: `npm run lint`.
3. Open a PR with screenshots/GIFs for UI changes.

Please follow **conventional commits** where possible.

---

## License

Licensed under the **MIT License**.
