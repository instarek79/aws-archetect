# Docker deployment modes

This project supports two Docker Compose run modes:

1. **Split mode**: `frontend` + `backend` + `db`
2. **Single mode**: `app-all` + `db` (frontend and backend inside one container)

## Standardized internal ports

- Frontend container port: **3030**
- Backend container port: **8805**
- Postgres container port: **5432**

Only host-exposed ports are configurable via environment variables.

## External database volume location

Database data is persisted using a host bind mount:

- Compose key: `DB_DATA_PATH`
- Container target path: `/var/lib/postgresql/data`

Example values:

- Windows: `D:/aws-archetect-data/postgres`
- Linux: `/srv/aws-archetect/postgres`

## Required permissions for DB path

### Linux/macOS

Postgres in `postgres:15-alpine` runs as UID/GID `999`.

```bash
sudo mkdir -p /srv/aws-archetect/postgres
sudo chown -R 999:999 /srv/aws-archetect/postgres
sudo chmod 700 /srv/aws-archetect/postgres
```

### Windows (Docker Desktop)

- Ensure the drive containing `DB_DATA_PATH` is shared in Docker Desktop.
- Ensure your user has read/write permission on that directory.

## Setup

1. Copy env template:

```bash
cp .env.docker.example .env
```

2. Edit `.env` as needed (`DB_DATA_PATH`, exposed ports, credentials, API URL).

## Run commands

### Split mode (frontend + backend + db)

```bash
docker compose --profile split up --build -d
```

### Single mode (all app processes in one container + db)

```bash
docker compose --profile single up --build -d
```

## Flexible host port mapping

Set these in `.env` for deployment server requirements:

- `FRONTEND_HOST_PORT` (maps to internal 3030)
- `BACKEND_HOST_PORT` (maps to internal 8805)
- `DB_HOST_PORT` (maps to internal 5432)

Example:

```env
FRONTEND_HOST_PORT=80
BACKEND_HOST_PORT=8805
DB_HOST_PORT=15432
```

## API URL for frontend

Set browser-reachable backend URL:

```env
VITE_API_URL=http://your-server-domain-or-ip:8805
VITE_API_FALLBACK_URL=http://your-server-domain-or-ip:8805
```

## Notes

- Split mode is recommended for production clarity and scaling.
- Single mode is useful for compact deployments and quick test environments.
