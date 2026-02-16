# Docker deployment modes

This project supports two Docker Compose run modes:

1. **Split mode**: `frontend` + `backend` (SQLite default)
2. **Single mode**: `app-all` (frontend and backend inside one container, SQLite default)

Optional legacy DB mode:

3. **PostgreSQL profile**: add `db` service with `--profile postgres`

## Standardized internal ports

- Frontend container port: **3030**
- Backend container port: **8805**
- SQLite file path in backend container: `data/aws_architect.db`

Only host-exposed ports are configurable via environment variables.

## External database volume location (SQLite)

SQLite data is persisted using a host bind mount:

- Compose key: `SQLITE_DATA_PATH`
- Container target path:
  - Split mode backend: `/app/data`
  - Single mode app-all: `/app/backend/data`

Example values:

- Windows: `D:/aws-archetect-data/sqlite`
- Linux: `/srv/aws-archetect/sqlite`

## Required permissions for SQLite path

### Linux/macOS

```bash
sudo mkdir -p /srv/aws-archetect/sqlite
sudo chown -R $USER:$USER /srv/aws-archetect/sqlite
sudo chmod 755 /srv/aws-archetect/sqlite
```

### Windows (Docker Desktop)

- Ensure the drive containing `SQLITE_DATA_PATH` is shared in Docker Desktop.
- Ensure your user has read/write permission on that directory.

## Setup

1. Copy env template:

```bash
cp .env.docker.example .env
```

2. Edit `.env` as needed (`SQLITE_DATA_PATH`, exposed ports, API URL).

## Run commands

### Split mode (frontend + backend)

```bash
docker compose --profile split up --build -d
```

### Single mode (all app processes in one container)

```bash
docker compose --profile single up --build -d
```

### Optional PostgreSQL profile (legacy)

```bash
docker compose --profile split --profile postgres up --build -d
```

## Flexible host port mapping

Set these in `.env` for deployment server requirements:

- `FRONTEND_HOST_PORT` (maps to internal 3030)
- `BACKEND_HOST_PORT` (maps to internal 8805)
- `DB_HOST_PORT` (maps to internal 5432, only if postgres profile is enabled)

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

- SQLite is the default and target deployment DB.
- Split mode is recommended for production clarity and scaling.
- Single mode is useful for compact deployments and quick test environments.
