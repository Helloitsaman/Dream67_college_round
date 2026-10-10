Agent DB - FastAPI + MongoDB Atlas connection test

1. Open .env and check MONGODB_URI has the real connection string and password.
   (.env starts with a dot, so it may be hidden in your file browser.)
2. pip install -r requirements.txt
3. python main.py

"SUCCESS: connected." means the database is reachable and the API starts at
http://127.0.0.1:8000. "FAILED:" prints the likely cause and exits.

Routes:
  GET  /health   pings the cluster, returns document count
  POST /items    saves any JSON object
  GET  /items    returns the most recent documents (default 20, max 100)
  /docs          browser page to try POST and GET
