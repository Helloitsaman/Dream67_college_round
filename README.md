# AgentBreak

Fullstack application with **Next.js** (Frontend) and **FastAPI + MongoDB Atlas** (Backend).

---

## Project Structure

```
Dream67_college_round/
├── backend/                  # FastAPI Python backend
│   ├── main.py              # FastAPI app with CORS & MongoDB Atlas driver
│   ├── requirements.txt     # Python dependencies
│   ├── .env                 # Database credentials & settings (git-ignored)
│   ├── .env.example         # Example configuration template
│   └── README.md            # Backend specific instructions
│
├── frontend/                 # Next.js 16 frontend
│   ├── src/                 # App router, components, styles
│   ├── package.json         # Node dependencies & scripts
│   ├── .env.local           # Frontend environment (NEXT_PUBLIC_API_URL)
│   ├── .env.example         # Example configuration template
│   └── README.md            # Frontend specific instructions
│
├── .gitignore               # Unified git ignore rules
├── main.py                  # Root shortcut launcher delegating to backend/main.py
└── requirements.txt         # Root requirements shortcut
```

---

## Running Both Services Concurrently

To run both services together, open two terminal windows:

### Terminal 1: Backend (FastAPI on Port 8000)

```powershell
# 1. Activate Python virtual environment (if not already activated)
.\.venv\Scripts\Activate.ps1

# 2. Run backend
python backend/main.py
```
> The API will run at `http://127.0.0.1:8000`  
> Interactive docs: `http://127.0.0.1:8000/docs`  
> Health check: `http://127.0.0.1:8000/health`

### Terminal 2: Frontend (Next.js on Port 3000)

```powershell
# 1. Navigate to frontend folder
cd frontend

# 2. Start Next.js development server
pnpm dev
```
> The web app will run at `http://localhost:3000`

---

## Environment Variables

### Backend (`backend/.env`):
- `MONGODB_URI`: MongoDB Atlas connection string
- `DB_NAME`: MongoDB database name (default: `AgentBreak`)
- `COLLECTION_NAME`: MongoDB collection name (default: `items`)
- `PORT`: Port for the API server (default: `8000`)
- `CORS_ORIGINS`: Allowed frontend origins (default: `http://localhost:3000,http://127.0.0.1:3000`)

### Frontend (`frontend/.env.local`):
- `NEXT_PUBLIC_API_URL`: Backend URL (default: `http://127.0.0.1:8000`)
