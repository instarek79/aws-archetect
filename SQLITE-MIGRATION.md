# SQLite Database Migration

## Overview
The application has been migrated from PostgreSQL (Docker) to SQLite (file-based database).

**Benefits:**
- No Docker required
- Simpler setup and deployment
- Database is a single file that can be easily backed up
- Faster startup time
- Works offline without any external dependencies

## Database Location
```
backend/data/aws_architect.db
```

## Migration Summary
- **Users migrated:** 1
- **Resources migrated:** 325
- **Relationships migrated:** 110
- **Database size:** ~284 KB

## Files Modified

### Configuration
- `backend/app/core/config.py` - Added SQLite support with `DATABASE_TYPE` setting
- `backend/app/database.py` - Updated to handle both SQLite and PostgreSQL
- `backend/app/models.py` - Changed from PostgreSQL-specific JSON to generic SQLAlchemy JSON

### Scripts
- `START-BACKEND.ps1` - Updated to use SQLite (no Docker dependency)
- `MIGRATE-TO-SQLITE.ps1` - New script to run migration
- `backend/migrate_to_sqlite.py` - Python migration script

## How to Start the Application

### Start Backend (SQLite)
```powershell
.\START-BACKEND.ps1
```

### Start Frontend
```powershell
.\START-FRONTEND.ps1
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_TYPE` | `sqlite` | Database type: `sqlite` or `postgresql` |
| `SQLITE_DB_PATH` | `data/aws_architect.db` | Path to SQLite database file |

## Switching Back to PostgreSQL (if needed)

To use PostgreSQL instead of SQLite, set the environment variable:
```powershell
$env:DATABASE_TYPE = 'postgresql'
```

Or update `backend/app/core/config.py`:
```python
DATABASE_TYPE: str = "postgresql"
```

## Backup Database

Simply copy the SQLite file:
```powershell
Copy-Item "backend/data/aws_architect.db" "backup/aws_architect_$(Get-Date -Format 'yyyyMMdd').db"
```

## Re-running Migration

If you need to re-migrate from PostgreSQL:

1. Start Docker PostgreSQL:
   ```powershell
   docker start aws_architect_postgres
   ```

2. Run migration:
   ```powershell
   .\MIGRATE-TO-SQLITE.ps1
   ```

## Technical Details

### SQLite Configuration
- Foreign keys enabled via PRAGMA
- `check_same_thread=False` for FastAPI compatibility
- JSON fields stored as TEXT (SQLite's JSON1 extension)

### PostgreSQL Configuration (Legacy)
- Connection pooling with `pool_size=10`
- Connection recycling every hour
- Pre-ping for connection verification
