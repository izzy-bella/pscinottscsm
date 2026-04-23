# Church CMS Starter Project

This starter project includes:

- **Frontend:** React + Vite admin UI
- **Backend:** Express + Prisma API
- **Database:** PostgreSQL via Docker Compose
- **Imports:** members and households CSVs from your cleaned dataset
- **Attendance management:** attendance sessions, member check-in, quick status marking, dashboard stats
- **Member profile drawer:** opens on member name click, supports editing, notes, attachments, and profile pictures

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure the backend

```bash
cp backend/.env.example backend/.env
```

### 3. Start PostgreSQL

```bash
docker compose -f docker-compose.yml up -d
```

### 4. Create or update the database schema and seed the admin user

```bash
npm run db:migrate --workspace backend
npm run db:seed --workspace backend
```

### 5. Import members and households and generate demo attendance sessions

```bash
npm run import:members --workspace backend
```

### 6. Start the API and frontend

In one terminal:

```bash
npm run dev --workspace backend
```

In another terminal:

```bash
npm run dev --workspace frontend
```

Frontend: `http://localhost:5173`
Backend: `http://localhost:4000/api/health`

## Default admin user

- Email: `admin@psci.notts`
- Password: `ChangeMe123!`

## What is included now

### Backend modules

- auth scaffold
- members CRUD (list, get, create, update)
- households list
- dashboard report endpoint
- attendance sessions
- attendance record upsert / quick check-in
- member attendance history
- CSV import script for members and households

### Frontend modules

- dashboard
- people directory
- household list
- add member form
- attendance management screen
- member profile drawer

## Attendance API endpoints

- `GET /api/attendance/sessions`
- `POST /api/attendance/sessions`
- `GET /api/attendance/sessions/:id`
- `POST /api/attendance/sessions/:id/records`
- `POST /api/attendance/sessions/:id/bulk`
- `GET /api/attendance/member/:memberId`

## Still planned / next best upgrades

- profile pictures per member
- document uploads per member
- giving management UI
- care and prayer case UI
- role-based protected routes on the frontend
- production-ready auth screens


## New member profile features

- click the member name to open the profile
- edit core profile fields and save them back to the backend
- upload a profile picture
- attach documents to the member record
- add internal member notes
- local upload storage is served from `backend/uploads`

If you are upgrading an existing database, run the Prisma migration again after unzipping this version so the new profile and document fields are created.


> Note: In this starter, `db:migrate` uses `prisma db push` instead of migration files, so it works cleanly for fresh local development without a checked-in migrations directory.

## Production deployment with HTTPS domain

This repo now includes a production-ready Docker setup for a single-domain deployment with automatic HTTPS:

- [docker-compose.prod.yml](/Users/ezzybella/Downloads/church-cms-starter-profile-upgrade-2/docker-compose.prod.yml)
- [backend/Dockerfile](/Users/ezzybella/Downloads/church-cms-starter-profile-upgrade-2/backend/Dockerfile)
- [frontend/Dockerfile](/Users/ezzybella/Downloads/church-cms-starter-profile-upgrade-2/frontend/Dockerfile)
- [frontend/nginx.conf](/Users/ezzybella/Downloads/church-cms-starter-profile-upgrade-2/frontend/nginx.conf)
- [backend/.env.production.example](/Users/ezzybella/Downloads/church-cms-starter-profile-upgrade-2/backend/.env.production.example)
- [Caddyfile](/Users/ezzybella/Downloads/church-cms-starter-profile-upgrade-2/Caddyfile)

### 1. Create production env file

```bash
cp backend/.env.production.example backend/.env.production
```

Then edit:

- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGIN`
- `APP_URL`
- `ADMIN_PASSWORD`

### 2. Point your domain to the server

Create DNS records:

- `A` record for `your-domain.com` -> your server public IP
- optional `A` record for `www.your-domain.com` -> your server public IP

### 3. Update the Caddy domain

Edit [Caddyfile](/Users/ezzybella/Downloads/church-cms-starter-profile-upgrade-2/Caddyfile) and replace:

```txt
your-domain.com
```

with your real domain, for example:

```txt
pscinotts.org
```

### 4. Start production stack

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 5. Run schema push and seed inside the backend container

```bash
docker compose -f docker-compose.prod.yml exec backend npm run db:migrate
docker compose -f docker-compose.prod.yml exec backend npm run db:seed
```

### 6. Open the app

Caddy listens on:

- `80` for HTTP
- `443` for HTTPS

It automatically obtains and renews HTTPS certificates for your domain and forwards traffic to the frontend container.

### Production notes

- Uploads are persisted in the `church_cms_uploads` Docker volume
- PostgreSQL data is persisted in the `church_cms_pgdata_prod` Docker volume
- Caddy certificate data is persisted in the `caddy_data` Docker volume
- The frontend now defaults to `/api` in production builds, so a single-domain deployment works cleanly
- Password reset email delivery still needs a real SMTP/provider integration
- Your server firewall must allow inbound `80` and `443`
