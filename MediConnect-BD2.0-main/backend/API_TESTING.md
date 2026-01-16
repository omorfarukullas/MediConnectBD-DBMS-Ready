# MediConnect BD API Testing Guide

This document explains how to test the API endpoints using tools like Postman, Thunder Client (VS Code extension), or curl.

## Base URL
```
http://localhost:5000
```

## Authentication Endpoints

### 1. Register a New User
**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "01712345678",
  "role": "PATIENT"
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "01712345678",
  "role": "PATIENT",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Roles Available:**
- `PATIENT` (default)
- `DOCTOR`
- `ADMIN`
- `SUPER_ADMIN`

---

### 2. Login
**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "01712345678",
  "role": "PATIENT",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 3. Get Current User Profile
**Endpoint:** `GET /api/auth/profile`

**Headers Required:**
```
Authorization: Bearer <your-jwt-token>
```

**Response (200 OK):**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "01712345678",
  "role": "PATIENT",
  "createdAt": "2025-12-03T10:30:00.000Z",
  "updatedAt": "2025-12-03T10:30:00.000Z"
}
```

---

### 4. Update User Profile
**Endpoint:** `PUT /api/auth/profile`

**Headers Required:**
```
Authorization: Bearer <your-jwt-token>
```

**Request Body (all fields optional):**
```json
{
  "name": "John Updated",
  "phone": "01798765432",
  "password": "newpassword123"
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "name": "John Updated",
  "email": "john@example.com",
  "phone": "01798765432",
  "role": "PATIENT",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 5. Health Check
**Endpoint:** `GET /api/health`

**No Authentication Required**

**Response (200 OK):**
```json
{
  "status": "OK",
  "message": "MediConnect BD API is running",
  "timestamp": "2025-12-03T10:45:23.456Z"
}
```

---

## Testing with PowerShell (curl equivalent)

### 1. Health Check
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method Get
```

### 2. Register a User
```powershell
$body = @{
    name = "Jane Doe"
    email = "jane@example.com"
    password = "password123"
    phone = "01712345678"
    role = "DOCTOR"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method Post -Body $body -ContentType "application/json"
```

### 3. Login
```powershell
$loginBody = @{
    email = "jane@example.com"
    password = "password123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $response.token
Write-Host "Token: $token"
```

### 4. Get Profile (with token)
```powershell
$headers = @{
    Authorization = "Bearer $token"
}

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/profile" -Method Get -Headers $headers
```

### 5. Update Profile
```powershell
$updateBody = @{
    name = "Dr. Jane Doe"
    phone = "01798765432"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/profile" -Method Put -Body $updateBody -ContentType "application/json" -Headers $headers
```

---

## Common Error Responses

### 400 Bad Request
```json
{
  "message": "Please provide name, email, and password"
}
```

### 401 Unauthorized
```json
{
  "message": "Not authorized, no token provided"
}
```

### 403 Forbidden
```json
{
  "message": "Access denied. Admin privileges required."
}
```

### 500 Internal Server Error
```json
{
  "message": "Server error during registration",
  "error": "Detailed error message"
}
```

---

## Next Steps

After testing these endpoints, you can:
1. Test the doctor endpoints
2. Test appointment creation and management
3. Test emergency service endpoints
4. Integrate these APIs with your React frontend
