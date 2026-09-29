# Railway deployment

This repo is already prepared for Railway, but the app is split into a backend service and a frontend service.

## Recommended setup: two Railway services

### 1) Backend service

Create a new Railway project and add a service from the repo.

- Root directory: `backend`
- Build command: `npm install && npm run build`
- Start command: `npm run start`
- Health check path: `/requests`

Environment variables:

```bash
PORT=3000
CORS_ORIGINS=https://your-frontend-domain.up.railway.app,http://localhost:5173
AI_API_KEY=your_key_here
AI_MODEL=gpt-4o-mini
AI_BASE_URL=https://api.openai.com/v1
```

Notes:
- Railway sets `PORT` automatically; keeping `PORT=3000` is fine for local dev but Railway will override it at runtime.
- If you are using Requesty or another OpenAI-compatible provider, set `AI_BASE_URL` to that endpoint instead.
- The backend is already configured to listen on `0.0.0.0` and accept Railway origins via `CORS_ORIGINS`.

After deployment, copy the generated backend URL. You will use it in the frontend service.

### 2) Frontend service

Add a second service to the same project.

- Root directory: `frontend`
- Build command: `npm install && npm run build`
- Start command: `npx vite preview --host 0.0.0.0 --port $PORT`

Environment variables:

```bash
VITE_API_BASE=https://your-backend-domain.up.railway.app
```

This ensures the UI talks to the deployed backend instead of a local Flask or Node dev server.

## Optional: one service only

If you want to keep it simpler, you can run both the API and the Vite preview from one service, but it is less clean and not the preferred Railway pattern for a frontend + backend split.

## Public URL and custom domain

Once each service is live:

1. Open the Railway service dashboard
2. Click the domain tab
3. Generate a public domain
4. Copy the frontend public URL into the backend `CORS_ORIGINS` value
5. Optionally attach a custom domain to the frontend and backend separately

## Example final values

```bash
# backend
CORS_ORIGINS=https://operations-hub-frontend.up.railway.app
AI_MODEL=gpt-4o-mini
AI_BASE_URL=https://api.openai.com/v1

# frontend
VITE_API_BASE=https://operations-hub-backend.up.railway.app
```

## Verify deployment

After the services are up:

- Visit the frontend URL
- Create a request from the UI
- Confirm the frontend calls the backend
- Confirm `/requests` responds from the backend
- Test the AI intake endpoint with a sample payload

Example:

```bash
curl -X POST https://your-backend-domain.up.railway.app/requests/intake \
  -H "Content-Type: application/json" \
  -d '{"freeText":"My laptop will not turn on"}'
```
