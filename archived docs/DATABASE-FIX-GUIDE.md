# 🔧 Database Password Authentication Fix

## ❌ Error
```
password authentication failed for user "postgres"
```

## 🎯 Quick Fix (Choose One)

---

### **Option 1: Set PostgreSQL password to "postgres" (Easiest)**

**Step 1:** Run as Administrator in PowerShell:
```powershell
psql -U postgres -f setup-database.sql
```

**If psql asks for current password:** Press Enter (if no password) or type your current password.

**Done!** Now run:
```powershell
.\START-ALL.ps1
```

---

### **Option 2: Use your existing PostgreSQL password**

**Step 1:** Run the password fix script:
```powershell
.\FIX-DATABASE-PASSWORD.ps1
```

**Step 2:** Choose option 2 and enter your existing PostgreSQL password

**Step 3:** Create the database:
```powershell
psql -U postgres -c "CREATE DATABASE auth_db;"
```

**Step 4:** Start the app:
```powershell
.\START-ALL.ps1
```

---

### **Option 3: Manual setup**

**If you know your PostgreSQL password:**

1. Create `.env` file in `backend/` folder:
```env
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=YOUR_ACTUAL_PASSWORD_HERE
POSTGRES_DB=auth_db
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama3.2
```

2. Create database:
```powershell
psql -U postgres -c "CREATE DATABASE auth_db;"
```

3. Start app:
```powershell
.\START-ALL.ps1
```

---

## 🔍 Troubleshooting

### Can't find psql command?

**Add PostgreSQL to PATH:**
1. Find PostgreSQL installation (usually `C:\Program Files\PostgreSQL\XX\bin`)
2. Add to System PATH environment variable
3. Restart PowerShell

**Or run psql with full path:**
```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -f setup-database.sql
```

### Don't know PostgreSQL password?

**Reset it:**
1. Find `pg_hba.conf` file (usually in `C:\Program Files\PostgreSQL\XX\data`)
2. Open as Administrator
3. Change this line:
   ```
   host    all    all    127.0.0.1/32    md5
   ```
   To:
   ```
   host    all    all    127.0.0.1/32    trust
   ```
4. Restart PostgreSQL service
5. Run: `psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'postgres';"`
6. Change `pg_hba.conf` back to `md5`
7. Restart PostgreSQL service again

---

## ✅ Verify Setup

**Test connection:**
```powershell
psql -U postgres -d auth_db -c "SELECT 'Connection successful!' as status;"
```

**Should output:**
```
      status
---------------------
 Connection successful!
```

---

## 📝 Summary

**The issue:** Your PostgreSQL has a different password than what the app expects ("postgres")

**The solution:** Either:
- Set PostgreSQL password to "postgres", OR
- Create a `.env` file with your actual password

**After fixing:** Run `.\START-ALL.ps1`

---

**Need more help?** Check PostgreSQL service is running:
```powershell
Get-Service postgresql*
```

Should show status: **Running**
