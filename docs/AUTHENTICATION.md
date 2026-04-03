# LMS Portal - Authentication & RBAC System

## Overview

This document describes the complete Authentication and Role-Based Access Control (RBAC) system implemented for the LMS Portal. The system supports two roles: **`user`** and **`admin`**.

---

## Quick Start

### 1. **First-Time Setup**

When the backend starts for the first time, it automatically runs the seed script to create an initial admin:

```bash
docker-compose up --build
```

The adminseed script will:
- Check if any admin exists in MongoDB
- If NOT, create the default admin with:
  - **Email:** `admin@lms.com`
  - **Password:** `admin123`
  - **Role:** `admin`

### 2. **Manual Seeding (if needed)**

To manually seed the admin, run:

```bash
cd backend
npm install
node seedAdmin.js
```

---

## System Architecture

### Backend Structure

```
backend/
├── models/
│   └── User.js                 # MongoDB User schema
├── middleware/
│   └── authMiddleware.js       # JWT verification & role authorization
├── routes/
│   ├── auth.js                 # Register & Login
│   ├── user.js                 # User profile endpoints
│   └── admin.js                # Admin management endpoints
├── seedAdmin.js                # Initialize default admin
└── src/
    └── index.js                # Express app with integrated routes
```

### Frontend Structure

```
frontend/src/
├── pages/
│   ├── Login.js                # Login page
│   ├── Register.js             # Registration page
│   ├── UserDashboard.js        # User dashboard
│   └── AdminDashboard.js       # Admin dashboard
├── components/
│   └── ProtectedRoute.js       # Route protection wrapper
├── services/
│   └── axiosService.js         # Axios with JWT interceptor
└── styles/
    ├── Auth.css                # Authentication pages styling
    └── Dashboard.css           # Dashboard styling
```

---

## API Endpoints

### Authentication Routes (Public)

#### Register a New User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@lms.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439010",
    "name": "Super Admin",
    "email": "admin@lms.com",
    "role": "admin",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

---

### User Routes (Protected)

**Header Required:** `Authorization: Bearer <token>`

#### Get Current User Profile
```http
GET /api/user/profile
```

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "user",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

#### Update User Profile
```http
PUT /api/user/profile
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```

---

### Admin Routes (Protected, Admin Only)

**Header Required:** `Authorization: Bearer <token>`

#### Create a New Admin
```http
POST /api/admin/create-admin

{
  "name": "Super Admin 2",
  "email": "admin2@lms.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "message": "Admin created successfully",
  "admin": {
    "id": "507f1f77bcf86cd799439012",
    "name": "Super Admin 2",
    "email": "admin2@lms.com",
    "role": "admin"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### List All Users
```http
GET /api/admin/users
```

**Response:**
```json
[
  {
    "id": "507f1f77bcf86cd799439010",
    "name": "Super Admin",
    "email": "admin@lms.com",
    "role": "admin",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

#### Get Admin Statistics
```http
GET /api/admin/stats
```

**Response:**
```json
{
  "totalUsers": 5,
  "totalAdmins": 2,
  "totalRegularUsers": 3
}
```

#### Delete a User
```http
DELETE /api/admin/users/:userId
```

**Note:** Cannot delete your own account.

---

## Frontend Usage

### 1. **Login**

Navigate to `/login` and enter credentials:
- Demo Admin: `admin@lms.com` / `admin123`
- Or register a new account

The JWT token is automatically stored in `localStorage` with key `token`.

### 2. **Role-Based Redirection**

After login, users are automatically redirected:
- **Admin** → `/admin-dashboard`
- **User** → `/user-dashboard`

### 3. **Protected Routes**

Routes are protected using the `<ProtectedRoute>` component:

```jsx
<Route 
  path="/admin-dashboard" 
  element={
    <ProtectedRoute requiredRole="admin">
      <AdminDashboard />
    </ProtectedRoute>
  } 
/>
```

### 4. **Axios Interceptor**

All API requests automatically include the JWT token:

```javascript
// axiosService.js adds Authorization header to every request:
Authorization: Bearer <token>
```

---

## Security Features

✅ **Passwords:** Bcrypt hashed with salt factor of 10  
✅ **JWT:** Tokens expire after 1 hour  
✅ **Role Validation:** Role is always fetched from database, not from client  
✅ **Admin Creation:** Only admins can create new admins  
✅ **Self-Protection:** Admins cannot delete their own accounts  
✅ **CORS:** Properly configured for frontend access  
✅ **Password Minimum:** 6 characters enforced

---

## Environment Variables

### Backend (.env or docker-compose.yml)

```env
PORT=5000
MONGO_URI=mongodb://lms-mongo:27017/lms
ML_SERVICE_URL=http://lms-ml:8000
JWT_SECRET=your-super-secret-jwt-key-change-in-production-2024
```

**⚠️ Important:** Change `JWT_SECRET` in production!

---

## Database Schema

### User Collection

```javascript
{
  _id: ObjectId,
  name: String,          // Required
  email: String,         // Required, Unique
  password: String,      // Bcrypt hashed, not returned by default
  role: String,          // Enum: ("user", "admin"), Default: "user"
  createdAt: Date,       // Auto-generated
  updatedAt: Date        // Auto-generated
}
```

---

## Testing the System

### 1. **Test Registering a User**

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "test123"
  }'
```

### 2. **Test Login**

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@lms.com",
    "password": "admin123"
  }'
```

### 3. **Test Protected Route**

```bash
curl -X GET http://localhost:5000/api/user/profile \
  -H "Authorization: Bearer <your_token>"
```

### 4. **Test Admin Route**

```bash
curl -X GET http://localhost:5000/api/admin/users \
  -H "Authorization: Bearer <admin_token>"
```

---

## Troubleshooting

### **Admin not created automatically**

1. Check MongoDB connection:
   ```bash
   docker logs lms-mongo
   ```

2. Manually seed admin:
   ```bash
   docker-compose exec lms-backend node seedAdmin.js
   ```

### **Token expiry error (401)**

- Token expires after 1 hour
- User is automatically redirected to login page
- Frontend clears token from localStorage

### **Invalid credentials on login**

- Verify email matches exactly (case-insensitive)
- Check password is correct
- Ensure user exists in database

### **Cannot create admin (403)**

- Only admins can create other admins
- Verify your token belongs to an admin account

---

## Existing Features (Unchanged)

✅ Home page  
✅ Skill Predictor (`/api/predict`)  
✅ Course management  
✅ ML service integration  
✅ Prometheus metrics  
✅ Grafana dashboards  
✅ Docker compose setup  

---

## Default Credentials

```
Email:    admin@lms.com
Password: admin123
Role:     admin
```

**⚠️ Change these credentials in production!**

---

## Next Steps

1. **Deploy to production** with secure JWT_SECRET
2. **Change default admin credentials**
3. **Enable HTTPS** on production
4. **Add email verification** (optional)
5. **Implement password reset** (optional)
6. **Add 2FA authentication** (optional)

---

## Support

For issues or questions, check the Backend and Frontend logs:

```bash
docker logs lms-backend
docker logs lms-frontend
```

---

**Version:** 1.0.0  
**Last Updated:** 2026-04-03
