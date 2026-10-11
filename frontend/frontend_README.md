# AgentBreak — Security Dashboard (Frontend)

The web UI for **AgentBreak**, an autonomous AI red-team platform. It runs
adversarial security campaigns against a target AI agent, then visualizes the
findings, execution traces, and defense validation.

Built with **React 18 + TypeScript + Vite**, styled with **Tailwind CSS**, and
charted with **Recharts**. The look is a dark "Aurelius" theme — pure-black
canvas with golden (`#FFD444`) accents and serif display type.

---

## Design System

| Token | Value | Use |
| :--- | :--- | :--- |
| Background (pure black) | `#070707` | App canvas |
| Panel | `#0D0D0F` / `#0E0E11` | Cards, inputs |
| Elevated | `#161618` | Raised surfaces |
| **Accent (gold)** | `#FFD444` | Primary accent, active states, highlights |
| Border (subtle) | `#222226` / `#2E2E34` | Card and input borders |
| Text (white) | `#FFFFFF` | Primary text |
| Text (muted) | `#A1A1AA` | Secondary text |

**Typography (Google Fonts):**
- `Playfair Display` → `.font-serif-display` — headings
- `Cormorant Garamond` (italic) → `.font-cursive-italic` — subtitles/accents
- `Inter` — body text (default)
- `JetBrains Mono` → `.font-mono` — code, IDs, trace detail

**Reusable classes** (defined in `src/index.css`): `.ab-card`, `.ab-card-active`,
`.ab-btn-primary` (outlined gold → fills on hover), `.ab-btn-solid` (solid gold),
`.ab-btn-outline`, `.ab-input`. Selection and scrollbars are gold-tinted.

---

## Tech Stack

| Layer | Choice |
| :--- | :--- |
| Framework | React 18.3 |
| Language | TypeScript 5.4 |
| Build tool | Vite 5 (dev server on port **5173**) |
| Styling | Tailwind CSS 3.4 (+ PostCSS, Autoprefixer) |
| Charts | Recharts 2.12 |
| Icons | lucide-react |

---

## Project Structure

```
frontend/
├── index.html                 # Entry; loads Google Fonts, mounts #root
├── vite.config.ts             # Dev server + /api proxy to the backend
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
└── src/
    ├── main.tsx               # React root
    ├── App.tsx                # Tab router + global data loading
    ├── index.css              # Theme tokens + .ab-* component classes
    ├── types/index.ts         # All API data types (the backend contract)
    ├── services/api.ts        # Typed fetch client (API_BASE = '/api')
    ├── components/
    │   ├── Navbar.tsx          # Sidebar nav + system telemetry
    │   └── SeverityBadge.tsx   # Severity + outcome badges
    ├── charts/
    │   └── SecurityCharts.tsx  # Category + severity-distribution bar charts
    └── pages/
        ├── HomePage.tsx            # Execution-mode setup (deterministic / hybrid LLM)
        ├── RunTestPage.tsx         # Configure & launch a campaign; edit agent policy
        ├── OverviewPage.tsx        # Security Evaluation Center (metrics + charts)
        ├── FindingsPage.tsx        # Vulnerability findings + status management
        ├── AttackTracePage.tsx     # Step-by-step execution trace timeline
        └── DefenseComparisonPage.tsx # Defense & replay before/after comparison
```

---

## Pages (Workspace Views)

1. **Execution Mode (Home)** — choose `deterministic` (no API key, fully
   reproducible) or `hybrid_llm`, and set the LLM provider/model.
2. **Configure & Run Campaign** — pick a target agent and scenarios, toggle
   defense controls / presets, and launch a test run.
3. **Security Evaluation Center (Overview)** — campaign metrics (attack success
   rate, leakage, coverage, reproducibility), severity distribution, and
   per-category vulnerability charts.
4. **Vulnerability Findings** — confirmed findings with severity, evidence, and
   remediation; update finding status.
5. **Attack Trace Timeline** — the ordered execution events for a test case,
   with boundary-crossing steps highlighted.
6. **Defense & Replay Lab** — re-run attacks against a hardened policy and
   compare ASR, leakage, and functional preservation before vs after.

---

## Backend Connection

The app talks to the FastAPI backend entirely through relative `/api` paths
(`src/services/api.ts`, `API_BASE = '/api'`). In development, `vite.config.ts`
proxies `/api` to the backend, so the browser sees everything as same-origin —
**no CORS setup needed** while developing.

```ts
// vite.config.ts
server: {
  port: 5173,
  proxy: { '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true } },
}
```

Endpoints consumed: `/api/system/*`, `/api/agents*`, `/api/scenarios`,
`/api/test-runs*`, `/api/findings*`, `/api/replays*`, `/api/reports/{id}`.

---

## Running Locally

Prerequisites: **Node.js 18+** and the AgentBreak backend running on port 8000.

```bash
# from the frontend/ folder
npm install        # first time only
npm run dev        # starts Vite on http://localhost:5173
```

Then open **http://localhost:5173**. Start the backend first (`python
backend/main.py`) so the sidebar shows the live MongoDB name and stored-run
count instead of "offline".

**Scripts:**
- `npm run dev` — dev server with hot reload (port 5173)
- `npm run build` — type-check (`tsc`) and produce a production bundle in `dist/`
- `npm run preview` — serve the built bundle locally

---

## Production Note

The `/api` proxy only applies to the Vite dev server. If you deploy the built
static files, point the frontend at the deployed backend URL and enable CORS on
the backend for the frontend's origin.
