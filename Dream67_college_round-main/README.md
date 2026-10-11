# AgentBreak — Autonomous AI Security Testing Platform

Fullstack application with **Vite + React + Tailwind CSS** (Frontend Dashboard) and **FastAPI + MongoDB Atlas + OpenRouter** (Backend).

---

## Project Structure

```
Dream67_college_round-main/
├── backend/                  # FastAPI Python backend
│   ├── app/
│   │   ├── openrouter_client.py  # OpenRouter LLM client
│   │   ├── platform_api.py       # Dashboard REST API (/api/*)
│   │   ├── platform_store.py     # MongoDB persistence & OWASP 2026 engine
│   │   ├── real_scan.py          # Live LLM scan endpoint (/api/real/scan)
│   │   └── storage.py            # Run & trace step storage
│   ├── main.py              # FastAPI app with CORS & MongoDB Atlas driver
│   ├── mvp_demo.py          # Deterministic demo scan (/api/demo/scan)
│   ├── requirements.txt     # Python dependencies
│   ├── .env                 # Database & OpenRouter credentials
│   └── .env.example         # Example configuration template
│
├── frontend/                 # Vite + React + Tailwind CSS Security Dashboard
│   ├── src/
│   │   ├── charts/          # Recharts vulnerability & severity charts
│   │   ├── components/      # Sidebar Navbar & Severity/Outcome badges
│   │   ├── pages/           # Home, Campaign, Live Scan, Overview, Findings, Traces, Replay
│   │   ├── services/        # Backend API client
│   │   └── types/           # TypeScript interfaces
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts       # Proxies /api, /runs, /health -> http://127.0.0.1:8000
│
├── main.py                  # Root shortcut launcher delegating to backend/main.py
└── requirements.txt         # Root requirements shortcut
```

---

## Running Both Services Concurrently

To run both services together, open two terminal windows in `Dream67_college_round-main`:

### Terminal 1: Backend (FastAPI on Port 8000)

```powershell
python backend/main.py
```
> The API will run at `http://127.0.0.1:8000`  
> Interactive docs: `http://127.0.0.1:8000/docs`  
> Health check: `http://127.0.0.1:8000/health`

### Terminal 2: Frontend (Vite on Port 5173)

```powershell
cd frontend
npm.cmd run dev
```
> The web dashboard will run at `http://localhost:5173`
