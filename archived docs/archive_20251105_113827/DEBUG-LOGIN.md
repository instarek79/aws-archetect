# 🔍 Login Debugging Guide

## ❌ The Error You're Seeing (Not the Problem)

```
Unchecked runtime.lastError: A listener indicated an asynchronous 
response by returning true, but the message channel closed...
```

**This is a browser extension warning - NOT your login issue!**
- Common with extensions like React DevTools, Redux DevTools
- Harmless and can be ignored
- Not related to your login functionality

---

## ✅ Backend is Working

**From logs:**
```
INFO: "POST /auth/login HTTP/1.1" 200 OK
INFO: "GET /auth/me HTTP/1.1" 200 OK
```

✅ Backend is running  
✅ Login endpoint returns success  
✅ Auth verification works  

**The issue is in the frontend!**

---

## 🔧 Quick Fixes

### Fix 1: Clear Browser Cache & Storage

**Method 1: DevTools**
```
1. Open DevTools (F12)
2. Go to "Application" tab
3. Click "Clear storage" (left sidebar)
4. Check all boxes
5. Click "Clear site data"
6. Refresh page (Ctrl+F5)
7. Try login again
```

**Method 2: Console**
```javascript
// Paste in browser console (F12 → Console tab):
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Fix 2: Check Console for Real Errors

```
1. Open DevTools (F12)
2. Go to "Console" tab
3. Clear all messages (trash icon)
4. Try to login
5. Look for RED errors (ignore extension warnings)
6. Share any RED errors you see
```

### Fix 3: Check Network Tab

```
1. Open DevTools (F12)
2. Go to "Network" tab
3. Try to login
4. Look for /auth/login request
5. Click on it
6. Check "Response" tab
7. See if you get access_token
```

---

## 🧪 Test Login Manually

### Step 1: Open Browser Console (F12)

### Step 2: Paste This Test Code

```javascript
// Test login with demo credentials
fetch('http://localhost:8000/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@example.com',
    password: 'admin123'
  })
})
.then(r => r.json())
.then(data => {
  console.log('✅ Login Response:', data);
  if (data.access_token) {
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    console.log('✅ Tokens saved!');
    window.location.href = '/dashboard';
  }
})
.catch(e => console.error('❌ Login Error:', e));
```

**Expected output:**
```javascript
✅ Login Response: {
  access_token: "eyJ0eXAiOiJKV1QiLCJhb...",
  refresh_token: "eyJ0eXAiOiJKV1QiLCJhb...",
  token_type: "bearer"
}
✅ Tokens saved!
// Should redirect to /dashboard
```

---

## 🔍 Common Issues & Solutions

### Issue 1: Login Button Does Nothing

**Symptom:** Click login, nothing happens

**Causes:**
- JavaScript error blocking form submission
- React event not firing
- Form validation error

**Solution:**
```
1. Open Console (F12)
2. Click login button
3. Check for errors
4. Make sure email is valid format
5. Make sure password is 6+ characters
```

### Issue 2: Login Succeeds but Doesn't Redirect

**Symptom:** Login works but stays on login page

**Causes:**
- Navigation blocked
- Token not saved
- React Router issue

**Solution:**
```javascript
// Check if tokens are saved (paste in console):
console.log('Access Token:', localStorage.getItem('access_token'));
console.log('Refresh Token:', localStorage.getItem('refresh_token'));

// If tokens exist, manually navigate:
window.location.href = '/dashboard';
```

### Issue 3: "Invalid Credentials" Error

**Symptom:** Red error message appears

**Causes:**
- Wrong email/password
- User doesn't exist in database

**Solution:**
```
Create a new user first:
1. Go to: http://localhost:3000/signup
2. Register new account
3. Then try login
```

### Issue 4: Network Error / CORS

**Symptom:** Login request fails

**Causes:**
- Backend not running
- CORS misconfigured
- Wrong API URL

**Solution:**
```
1. Check backend is running:
   docker-compose ps
   
2. Check backend health:
   http://localhost:8000/health
   
3. Check CORS in backend logs
```

---

## 🧪 Complete Test Procedure

### Test 1: Check Backend Health

```powershell
# PowerShell
curl http://localhost:8000/health

# Should return:
# {"status":"healthy","message":"API is running"}
```

### Test 2: Register New User

```
1. Go to: http://localhost:3000/signup
2. Email: test@test.com
3. Password: test123456
4. Click "Sign Up"
5. Should redirect to login
```

### Test 3: Login with New User

```
1. Go to: http://localhost:3000/login
2. Email: test@test.com
3. Password: test123456
4. Click "Log In"
5. Should redirect to /dashboard
```

### Test 4: Verify Authentication

```
1. After login, open DevTools (F12)
2. Go to "Application" tab
3. Left sidebar: Local Storage → http://localhost:3000
4. Should see:
   - access_token: eyJ0eXAi...
   - refresh_token: eyJ0eXAi...
```

---

## 🔧 Emergency Fix: Force Login

If nothing works, use this nuclear option:

```javascript
// Paste in browser console (F12 → Console):

// 1. Clear everything
localStorage.clear();
sessionStorage.clear();

// 2. Force login (change email/password if needed)
fetch('http://localhost:8000/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@example.com',  // Change this
    password: 'admin123'         // Change this
  })
})
.then(r => r.json())
.then(data => {
  if (data.access_token) {
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    alert('✅ Login successful!');
    setTimeout(() => window.location.href = '/dashboard', 1000);
  } else {
    alert('❌ Login failed: ' + JSON.stringify(data));
  }
})
.catch(e => alert('❌ Error: ' + e.message));
```

---

## 📝 What to Check Right Now

### 1. Open DevTools Console (F12)
```
Look for RED errors (not extension warnings)
Ignore "runtime.lastError" messages
```

### 2. Check What Happens When You Click Login
```
Does loading spinner appear?
Does error message appear?
Does page stay frozen?
```

### 3. Check Network Tab
```
Is /auth/login request sent?
What's the status code? (200 = good, 401 = bad credentials)
What's in the response?
```

### 4. Check Application Storage
```
DevTools → Application → Local Storage
Are tokens being saved?
```

---

## 🚨 If Still Not Working

**Provide this info:**

1. **Console errors (RED only):**
   - Open Console (F12)
   - Paste any RED error messages

2. **Network request details:**
   - Network tab → /auth/login
   - Status code: ?
   - Response body: ?

3. **What you see:**
   - Does button show loading?
   - Does error message appear?
   - What does error say?

4. **Test with curl:**
```powershell
curl -X POST http://localhost:8000/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"admin@example.com\",\"password\":\"admin123\"}'
```

---

## ✅ Most Likely Cause

Based on your symptoms, the issue is probably:

**1. User doesn't exist (most common)**
- Solution: Create account via /signup first

**2. Browser storage issue**
- Solution: Clear localStorage and try again

**3. JavaScript error blocking navigation**
- Solution: Check console for RED errors

---

## 🎯 Quick Checklist

Run through this checklist:

- [ ] Backend running? (`docker-compose ps`)
- [ ] Backend healthy? (http://localhost:8000/health)
- [ ] User account exists? (created via /signup)
- [ ] Correct email format? (must have @)
- [ ] Password 6+ characters?
- [ ] Browser console clear? (no RED errors)
- [ ] LocalStorage cleared? (cleared old tokens)
- [ ] Used correct URL? (http://localhost:3000/login)

---

## 💡 Pro Tips

**Ignore these messages:**
- ✅ "runtime.lastError" - Browser extension warning
- ✅ "listener indicated async response" - Extension issue
- ✅ "message channel closed" - Extension issue

**Pay attention to these:**
- ❌ "Network Error"
- ❌ "401 Unauthorized"
- ❌ "Invalid credentials"
- ❌ "TypeError"
- ❌ "Failed to fetch"

---

## 🔄 Start Fresh

If completely stuck:

```powershell
# Stop everything
docker-compose down

# Clear volumes
docker-compose down -v

# Start fresh
docker-compose up -d

# Wait 30 seconds for DB to initialize

# Create admin user
docker-compose exec backend python -c "
from app.database import SessionLocal
from app.models import User
db = SessionLocal()
user = User(email='admin@example.com', password='admin123')
db.add(user)
db.commit()
print('Admin created!')
"

# Now try login again
# Email: admin@example.com
# Password: admin123
```

---

**Try the "Quick Fixes" section first!** 🚀

Most login issues are fixed by clearing browser storage.
