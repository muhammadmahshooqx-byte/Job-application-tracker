# Deployment

Deploy the backend and managed PostgreSQL on Render, then deploy the static frontend on Vercel. The demo jobs in MaxxSwipe remain frontend demo data; application tracking, users, and authentication use the managed PostgreSQL database.

## Render database

1. Create a Render PostgreSQL database in the same region as the backend.
2. Record its internal connection string, user name, and password in Render only.

## Render backend

1. Create a new Render Web Service from this repository.
2. Set the service root directory to `application-tracker` and select Docker deployment.
3. Add these environment variables in Render:

   - `DB_URL`: the JDBC form of the Render internal PostgreSQL connection string.
   - `DB_USERNAME`: the managed database user.
   - `DB_PASSWORD`: the managed database password.
   - `JWT_SECRET`: a unique production secret of at least 32 random bytes.
   - `JWT_EXPIRATION_MS`: `86400000` unless a different token lifetime is required.
   - `CORS_ALLOWED_ORIGINS`: the Vercel frontend URL, with no trailing slash.

4. Deploy and record the public backend URL. The application listens on Render's `PORT` automatically.

## Vercel frontend

1. Import the same repository into Vercel.
2. Set the root directory to `tracker-frontend` and leave the build command as `npm run build`.
3. Set `VITE_API_URL` to `<backend-public-url>/api`, replacing the placeholder with the Render backend URL and omitting any trailing slash.
4. Deploy. Copy the resulting Vercel URL into the Render backend's `CORS_ALLOWED_ORIGINS` variable and redeploy the backend.

## Production smoke test

1. Open the Vercel URL and register a new user.
2. Sign in, create an application, change its status, and delete it.
3. Sign in as an existing admin account to verify admin access.
4. Confirm browser requests target the Render backend URL and have no CORS errors.

## Local container check

After installing Docker Desktop, copy `.env.example` to `.env`, set `POSTGRES_PASSWORD` and `JWT_SECRET`, then run `docker compose up --build`. Open `http://localhost:4173`.