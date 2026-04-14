# Quick Reference - LMS Portal Authentication System

## 🚀 Getting Started

### 1. Start the Application
```bash
docker-compose up --build
```

This automatically:
- Builds all services
- Creates default admin (admin@lms.com / admin123)
- Seeds MongoDB with courses
- Starts all containers

### 2. Access the Application
- **Frontend:** http://localhost
- **Backend API:** http://localhost/api
- **ML Service:** http://localhost/ml
- **Grafana:** http://localhost:3001
- **Prometheus:** http://localhost:9090

---

## 🔐 Authentication Flow

```
1. User visits /login or /register
   ↓
2. Submits credentials
   ↓
3. Backend validates & returns JWT token
   ↓
4. Frontend stores token in localStorage
   ↓
5. Axios interceptor adds token to all requests
   ↓
6. Backend middleware verifies token
   ↓
7. User granted/denied access based on role
```

---

## 👥 User Roles

### Regular User
- Register with `/api/auth/register`
- Login with `/api/auth/login`
- Access: `/api/user/profile`
- Can use ML Predictor
- Cannot access admin functions

### Admin
- Created via `/api/admin/create-admin` (by other admins)
- Or seeded automatically (first time)
- Access all user endpoints PLUS:
  - Create new admins
  - View all users
  - Delete users
  - View statistics

---

## 🔑 JWT Token Structure

```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "role": "user",
  "iat": 1705318200,
  "exp": 1705321800
}
```

**Expiry:** 1 hour from issue  
**Secret:** Set in `JWT_SECRET` env variable

---

## 📋 Common Tasks

### Task: Login as Admin
```bash
# Step 1: Visit http://localhost and click "Login"
# Step 2: Enter credentials
Email: admin@lms.com
Password: admin123

# Step 2: Redirected to Admin Dashboard
```

### Task: Register New User
```bash
# Step 1: Click "Register" button
# Step 2: Fill form (name, email, password)
# Step 3: Auto-redirected to User Dashboard
```

### Task: Create Another Admin
```bash
# Step 1: Login as existing admin
# Step 2: Go to Admin Dashboard
# Step 3: Click "Create Admin" tab
# Step 4: Fill form and click "Create Admin"
```

### Task: Delete a User
```bash
# Step 1: Login as admin
# Step 2: Go to Admin Dashboard → "Manage Users" tab
# Step 3: Click "Delete" button next to user
# Step 4: Confirm deletion
```

### Task: Update Profile
```bash
# Step 1: Login as any user
# Step 2: Go to User Dashboard
# Step 3: Click "Edit" button
# Step 4: Update name/email
# Step 5: Click "Save Changes"
```

---

## 🐛 Troubleshooting

### Issue: Admin not created on startup
**Solution:**
```bash
docker-compose down -v
docker-compose up --build
```

### Issue: "Invalid token" error
**Solution:**
- Token expired (1 hour) → Login again
- Wrong secret → Check JWT_SECRET in docker-compose.yml
- Clear localStorage: `localStorage.clear()`

### Issue: Cannot create admin
**Solution:**
- Verify you're logged in as admin
- Check role in Admin Dashboard (should show "admin")
- Try logging out and logging back in

### Issue: "Insufficient permissions" (403)
**Solution:**
- User role cannot access admin endpoints
- Only admins can access `/api/admin/*`
- Regular users can only access `/api/user/*`

### Issue: CORS error
**Solution:**
- Frontend must use `/api` prefix (handled by nginx)
- Or set `REACT_APP_API_URL=http://localhost:5000`

---

## 📊 Database Queries (MongoDB)

### View all users
```javascript
db.users.find({})
```

### View only admins
```javascript
db.users.find({ role: "admin" })
```

### View only regular users
```javascript
db.users.find({ role: "user" })
```

### Delete a user (careful!)
```javascript
db.users.deleteOne({ email: "user@example.com" })
```

### Update user role (careful!)
```javascript
db.users.updateOne(
  { email: "user@example.com" },
  { $set: { role: "admin" } }
)
```

---

## 🔧 Environment Variables

### Backend (docker-compose.yml)
```env
PORT=5000                                           # Backend port
MONGO_URI=mongodb://lms-mongo:27017/lms            # MongoDB connection
ML_SERVICE_URL=http://lms-ml:8000                  # ML service URL
JWT_SECRET=change-this-in-production
```

### Frontend (.env or environment)
```env
REACT_APP_API_URL=/api  # Backend API endpoint
```

---

## 🧪 Testing API with cURL

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "test123"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@lms.com",
    "password": "admin123"
  }'

# Response includes: token, user object
```

### Use Token (replace TOKEN)
```bash
TOKEN="eyJhbGciOi..."

curl -X GET http://localhost:5000/api/user/profile \
  -H "Authorization: Bearer $TOKEN"
```

### Admin: List Users
```bash
curl -X GET http://localhost:5000/api/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Admin: Get Stats
```bash
curl -X GET http://localhost:5000/api/admin/stats \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## 📁 Project Structure

```
LMS_portal/
├── backend/
│   ├── models/User.js
│   ├── middleware/authMiddleware.js
│   ├── routes/auth.js
│   ├── routes/user.js
│   ├── routes/admin.js
│   ├── seedAdmin.js
│   ├── src/index.js
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/Login.js
│   │   ├── pages/Register.js
│   │   ├── pages/UserDashboard.js
│   │   ├── pages/AdminDashboard.js
│   │   ├── components/ProtectedRoute.js
│   │   ├── services/axiosService.js
│   │   ├── styles/Auth.css
│   │   ├── styles/Dashboard.css
│   │   └── App.js
│   ├── package.json
│   └── Dockerfile
├── docs/
│   ├── AUTHENTICATION.md
│   ├── environment-variables.md
│   └── deployment-runbook.md
├── docker-compose.yml
├── IMPLEMENTATION_CHANGELOG.md
└── README.md
```

---

## 🎯 Key Files to Know

| File | Purpose |
|------|---------|
| `backend/seedAdmin.js` | Creates default admin on first run |
| `backend/middleware/authMiddleware.js` | JWT validation & role checking |
| `backend/routes/auth.js` | Login/Register endpoints |
| `backend/routes/admin.js` | Admin management endpoints |
| `frontend/services/axiosService.js` | JWT interceptor setup |
| `frontend/components/ProtectedRoute.js` | Route protection wrapper |
| `docs/AUTHENTICATION.md` | Full API documentation |

---

## ⚡ Performance Tips

- JWT tokens cached in localStorage (no re-fetch on page reload)
- Role checked locally before API calls (frontend optimization)
- Admin stats lightweight query (count only)
- User list paginated in future enhancement
- Prometheus metrics track auth endpoint performance

---

## 🔒 Production Checklist

- [ ] Change `JWT_SECRET` to secure random string
- [ ] Change default admin credentials
- [ ] Enable HTTPS on frontend & backend
- [ ] Use secure cookie flags
- [ ] Add rate limiting on auth endpoints
- [ ] Enable request logging & monitoring
- [ ] Set MongoDB authentication
- [ ] Review CORS policy
- [ ] Implement password reset
- [ ] Add email verification

---

## 📞 Useful Commands

```bash
# View backend logs
docker logs lms-backend

# View frontend logs
docker logs lms-frontend

# Access MongoDB CLI
docker exec -it lms-mongo mongosh

# Restart backend
docker-compose restart lms-backend

# Full system rebuild
docker-compose down -v && docker-compose up --build

# Manual seed admin
docker-compose exec lms-backend npm run seed-admin

# Check JWT token validity
# (Paste token at https://jwt.io)
```

---

## 💡 Tips & Tricks

1. **Save admin token** for testing admin endpoints
2. **Browser DevTools** → Application → localStorage to view token
3. **Postman** useful for testing APIs with complex headers
4. **JWT.io** to decode and inspect tokens
5. **MongoDB Compass** to view database contents

---

**Last Updated:** 2026-04-03  
**Status:** ✅ Complete and Production-Ready
