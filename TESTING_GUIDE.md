# MediConnect-BD Testing Guide

## ✅ System Status
- **Backend**: Running on http://localhost:5000
- **Frontend**: Running on http://localhost:3000  
- **Database**: MySQL on port 3307 (mediconnect)
- **API Integration**: Fully functional ✅

## 🔑 Test Accounts

All test accounts use password: `password123`

| Role | Email | Password | Portal Access |
|------|-------|----------|---------------|
| **PATIENT** | patient@test.com | password123 | Patient Portal |
| **DOCTOR** | doctor@test.com | password123 | Doctor Portal |
| **ADMIN** | admin@test.com | password123 | Hospital Admin Portal |
| **SUPER_ADMIN** | superadmin@test.com | password123 | Super Admin Portal |

## 🧪 Test Scenarios

### 1. Patient Registration & Login Flow

**Test New Registration:**
1. Open http://localhost:3000
2. Click "Patient Login"
3. Click "Register Account" button
4. Fill in the form:
   - Full Name: `John Doe`
   - Phone: `01712345678`
   - Age: `25`
   - Email: `john@example.com`
   - Password: `test123456` (min 6 chars)
   - Confirm Password: `test123456`
5. Click "Register Account"
6. **Expected**: Automatic login and redirect to Patient Portal
7. Check DevTools → Application → localStorage:
   - `authToken`: Should contain JWT token
   - `authUser`: Should contain user object

**Test Existing Patient Login:**
1. Click "Patient Login"
2. Enter:
   - Email: `patient@test.com`
   - Password: `password123`
3. Click "Log In"
4. **Expected**: Redirect to Patient Portal with user data

**Test Invalid Login:**
1. Click "Patient Login"
2. Enter wrong password
3. **Expected**: Red error message "Invalid email or password"

**Test Role Validation:**
1. Try logging into Patient Portal with doctor credentials
2. **Expected**: Error "This portal is for patients only"

### 2. Doctor Registration & Login Flow

**Test Doctor Registration (5-Step Form):**
1. Click "Doctor Login" → "Register"
2. **Step 1 - Basic Info**:
   - Full Name: `Dr. Sarah Khan`
   - Mobile: `01987654321`
   - Email: `sarah@doctor.com`
   - DOB: `1985-05-15`
   - Gender: `Female`
   - Password: `doctor123`
3. **Step 2 - Professional Info**:
   - BMDC Number: `A-54321`
   - Specialization: `Cardiology`
   - Experience: `8` years
   - Degrees: `MBBS, MD Cardiology`
   - Hospital: `Square Hospital`
4. **Step 3 - Documents**: Click "Next" (file upload mocked)
5. **Step 4 - Schedule**: Set availability times
6. **Step 5 - Fees**:
   - Online Fee: `800`
   - Physical Fee: `1200`
7. Click "Submit Application"
8. **Expected**: Success page "Application Submitted!"

**Test Doctor Login:**
1. Click "Doctor Login"
2. Email: `doctor@test.com`
3. Password: `password123`
4. **Expected**: Redirect to Doctor Portal

### 3. Hospital Admin Login

1. Click "Hospital Login" (from home page)
2. Email: `admin@test.com`
3. Password: `password123`
4. **Expected**: Redirect to Admin Portal

### 4. Super Admin Login

1. Click "Super Admin" (from home page)
2. Email: `superadmin@test.com`
3. Password: `password123`
4. **Expected**: Redirect to Super Admin Portal

## 🔍 Developer Testing

### Check Network Requests

1. Open DevTools → Network tab
2. Filter by "Fetch/XHR"
3. Login or register
4. **Expected requests**:
   - `POST http://localhost:5000/api/auth/login`
   - `POST http://localhost:5000/api/auth/register`
5. Click on request → Preview tab
6. **Expected response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Test Patient",
    "email": "patient@test.com",
    "role": "PATIENT"
  }
}
```

### Check LocalStorage

1. DevTools → Application → LocalStorage → http://localhost:3000
2. **Expected keys**:
   - `authToken`: JWT string
   - `authUser`: JSON object with `{id, name, email, role}`

### Check Console for Errors

1. DevTools → Console
2. **Should see**: No red error messages
3. **Optional**: API calls logged if debugging enabled

## 🐛 Common Issues & Solutions

### Issue: "Network error occurred"
**Solution**: 
- Check backend is running on port 5000
- Run: `cd backend; npm run dev`

### Issue: "Cannot connect to database"
**Solution**:
- Ensure MySQL is running on port 3307
- Check credentials in `backend/.env`

### Issue: "User already exists"
**Solution**:
- Use a different email address
- Or delete user from database

### Issue: Hot reload not working
**Solution**:
- Save the file again
- Or restart Vite server: `npm run dev`

### Issue: Login succeeds but portal doesn't load
**Solution**:
- Check browser console for errors
- Verify `currentUser` state is set in React DevTools

## 📊 Database Verification

### Check Users Table
```sql
USE mediconnect;
SELECT id, name, email, role, createdAt FROM Users ORDER BY createdAt DESC LIMIT 10;
```

### Check Doctors Table
```sql
SELECT d.id, u.name, d.bmdcNumber, d.specialization, d.consultationFee, d.isVerified 
FROM Doctors d 
JOIN Users u ON d.userId = u.id;
```

### Delete Test Data (if needed)
```sql
DELETE FROM Users WHERE email LIKE '%@example.com';
DELETE FROM Users WHERE email LIKE '%@doctor.com';
```

## 🎯 API Endpoints Testing

### Health Check
```powershell
curl http://localhost:5000/api/health
```
**Expected**: `{"status": "OK", "database": "Connected"}`

### Register User
```powershell
$body = @{
    name = "Test User"
    email = "test@example.com"
    phone = "01712345678"
    password = "test123"
    role = "PATIENT"
    age = 30
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method POST -Body $body -ContentType "application/json"
```

### Login User
```powershell
$body = @{
    email = "patient@test.com"
    password = "password123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -Body $body -ContentType "application/json"
```

## ✅ Verification Checklist

- [ ] Backend server running without errors
- [ ] Frontend loads on http://localhost:3000
- [ ] Patient can register new account
- [ ] Patient can login with existing account
- [ ] Doctor can complete 5-step registration
- [ ] Doctor can login
- [ ] Hospital admin can login
- [ ] Super admin can login
- [ ] JWT token is stored in localStorage
- [ ] User object is stored in localStorage
- [ ] Network tab shows API calls to localhost:5000
- [ ] No console errors in browser
- [ ] Logout clears localStorage and returns to home
- [ ] **NEW**: Doctor list loads from database
- [ ] **NEW**: Doctor search and filters work
- [ ] **NEW**: Appointment booking creates database record
- [ ] **NEW**: Appointments display in "My Appointments"
- [ ] **NEW**: Cancel appointment updates database
- [ ] **NEW**: Settings update saves to database
- [ ] **NEW**: Loading skeletons show while fetching data

## 🎯 Phase 3 Portal Features Testing

### Test Doctor Search & Filter
1. Login as patient
2. Patient Portal → Dashboard shows doctor grid
3. **Expected**: See loading skeletons → then doctor cards with real data
4. Try search by doctor name
5. Try filter by specialization (Cardiology, General Medicine, etc.)
6. **Verify**: Results update based on filters

### Test Appointment Booking End-to-End
1. In PatientPortal, click "View Profile & Book" on Dr. Test Doctor
2. **Modal opens** with doctor profile
3. Select tomorrow's date from calendar
4. Select "10:00 AM" time slot
5. Choose "In-Person" consultation type
6. Click "Proceed to Review"
7. **Step 2**: Verify details, click "Confirm Booking"
8. **Expected**: Success screen + "View in My Appointments" button
9. Click button to navigate to appointments
10. **Verify**: New appointment appears with "Confirmed" status

### Test Appointment Cancellation
1. Go to "My Appointments" in PatientPortal
2. Find a confirmed appointment
3. Click "Cancel Appointment" button
4. Confirm in popup
5. **Expected**: Status changes to "CANCELLED" immediately
6. Refresh page
7. **Verify**: Status still shows "CANCELLED" (persisted to database)

### Test Profile Settings Update
1. PatientPortal → Settings (gear icon)
2. Go to "Profile" tab
3. Change name to "Test Patient Updated"
4. Change phone to "01812345678"
5. Click "Save Settings"
6. **Expected**: "Settings saved successfully!" alert
7. Logout and login again
8. **Verify**: Name still shows "Test Patient Updated"

### Test Doctor Portal Appointments
1. Login as doctor (doctor@test.com / password123)
2. DoctorPortal loads
3. **Expected**: Dashboard shows appointment count
4. Go to "Appointments" tab
5. **Verify**: Table shows appointments (may be empty if none booked)
6. **Test**: Book appointment as patient, then check doctor portal
7. **Expected**: New appointment appears in doctor's list

### Test Loading States
1. Open DevTools → Network tab
2. Set throttling to "Slow 3G"
3. Refresh PatientPortal
4. **Expected**: See skeleton loaders for doctors grid
5. **Verify**: Smooth transition from skeleton → actual data

### Test Error Handling
1. Keep frontend running
2. Stop backend server (Ctrl+C in backend terminal)
3. Refresh PatientPortal
4. **Expected**: Error logged in console
5. **Verify**: Still shows mock doctor data (graceful fallback)
6. **Verify**: No app crashes, UI still functional

## 🚀 Next Steps After Testing

1. **Profile Management**: Add edit profile functionality
2. **Appointment Booking**: Integrate appointment creation API
3. **Doctor Search**: Implement doctor listing and search
4. **Notifications**: Add real-time notification UI
5. **File Upload**: Implement actual file upload for doctor verification
6. **Password Reset**: Add forgot password flow
7. **Mobile App**: Begin Flutter mobile app development using same API

---

**Last Updated**: December 3, 2025  
**Status**: Phase 2 Complete - Authentication Fully Integrated ✅
