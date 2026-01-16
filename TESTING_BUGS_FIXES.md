# 🧪 Quick Testing Guide - Appointment System Fixes

## Prerequisites
1. Backend server running on `http://localhost:5000`
2. Frontend running on `http://localhost:5173` (or your configured port)
3. MySQL database with schema loaded
4. At least one test user account

---

## 🔴 Test Scenario #1: Fix Server Error on Booking

### Steps:
1. **Login** as a patient
2. Click **"Find Doctor"** from dashboard
3. Select any doctor → Click **"Book Appointment"**
4. Choose:
   - Date: Any future date
   - Time: Any available slot
   - Type: In-Person or Telemedicine
5. Click **"Proceed to Confirmation"**
6. Click **"Confirm & Book"**

### ✅ Expected Results:
- **UI**: Shows green checkmark + "Booking Successful!" message
- **Console**: 
  ```
  📝 Booking payload being sent: {doctorId: X, appointmentDate: "...", ...}
  ✅ Booking successful, response: {id: X, queueNumber: X, ...}
  ```
- **Backend Console**:
  ```
  📋 Book Appointment Request Body: { doctorId: 1, appointmentDate: '2026-01-20', ... }
  👤 Authenticated User: { id: 123, name: 'John Doe', ... }
  ✅ Appointment created successfully: 45
  ```

### ❌ Before Fix (What Was Broken):
- Error: "500 Server Error" or "User Not Found"
- No appointment created in database
- No helpful error messages

---

## 🔴 Test Scenario #2: Remove Mock Data

### Steps:
1. After booking an appointment (from Test #1)
2. Click **"My Appointments"** from sidebar
3. Check the appointment list

### ✅ Expected Results:
- **UI**: Shows YOUR actual appointment (the one you just booked)
  - Doctor name matches the doctor you selected
  - Date/Time matches what you chose
  - Status: "Confirmed" (green badge)
  - Shows queue number
- **Console**:
  ```
  📋 Fetching appointments for user: 123
  ✅ Appointments received: [{id: 45, doctorName: "Dr. Rahman", date: "2026-01-20", ...}]
  ```
- **Backend Console**:
  ```
  📋 Fetching appointments for user: 123
  ✅ Found 1 appointments
  ```

### ❌ Before Fix (What Was Broken):
- Showed hardcoded "Dr. Lisa Anderson" and other fake doctors
- Your real booking didn't appear
- Always showed the same 3-4 mock appointments

---

## 🔴 Test Scenario #3: Fix Cancel Appointment

### Steps:
1. Go to **"My Appointments"**
2. Find a CONFIRMED appointment
3. Click **"Cancel Appointment"** button
4. Click **"Yes, Cancel"** in confirmation modal

### ✅ Expected Results:
- **UI**: 
  - Appointment status changes to "CANCELLED" (red badge)
  - Appointment becomes semi-transparent
  - "Cancel Appointment" button disappears
- **Console**:
  ```
  🗑️ Cancelling appointment: 45
  ✅ Appointment cancelled successfully
  ```
- **Backend Console**:
  ```
  PUT /api/appointments/45 - Status: 200
  ```

### ❌ Before Fix (What Was Broken):
- Error: `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`
- Modal closed but status didn't change
- 404 Not Found error

---

## 🎁 BONUS: Test Guest Booking Flow

### Steps:
1. **Logout** completely
2. Navigate to **"Find Doctor"** page (without logging in)
3. Click **"Book Appointment"** on ANY doctor
4. **Expected**: Alert appears → Redirected to login page
5. **Login** with your credentials
6. **Expected**: Booking modal AUTOMATICALLY opens for the doctor you selected

### ✅ Expected Results:
- **Before Login**:
  - Alert: "Please log in to book an appointment. Your selection will be saved."
  - Redirected to login page
  - `sessionStorage` has key `mediconnect_pending_booking`
  
- **After Login**:
  - Booking modal opens automatically
  - Doctor name matches the one you clicked while logged out
  - Console:
    ```
    📋 Found pending booking from guest session: {doctorId: 5, doctorName: "Dr. Rahman", ...}
    ✅ Auto-opened booking modal for: Dr. Rahman
    ```

---

## 🔍 How to Check Logs

### Browser Console (Frontend)
1. Press **F12** → **Console** tab
2. Look for emoji prefixes:
   - 📝 = Sending data
   - 📋 = Fetching data
   - ✅ = Success
   - ❌ = Error
   - 🗑️ = Delete/Cancel

### Backend Console (Terminal)
1. Look at the terminal where you ran `npm start` in the `backend` folder
2. Same emoji prefixes as frontend
3. Shows SQL queries if logging is enabled

---

## 🛠️ Troubleshooting

### Problem: Still getting 500 Error on booking
**Solution:**
1. Check backend console for the exact error
2. Verify you're logged in (check `localStorage.getItem('mediconnect_token')`)
3. Ensure MySQL database is running
4. Check that Appointment and Doctor tables exist

### Problem: Appointments list is empty
**Solution:**
1. Book a test appointment first
2. Check console for "✅ Found X appointments"
3. If X=0, check database directly:
   ```sql
   SELECT * FROM Appointments WHERE patientId = YOUR_USER_ID;
   ```

### Problem: Cancel returns 404
**Solution:**
1. Check the appointment ID in console log
2. Verify the route in backend/server.js:
   ```javascript
   app.use('/api/appointments', appointmentRoutes);
   ```
3. Check that authMiddleware is working (token is valid)

### Problem: Guest booking doesn't work
**Solution:**
1. Make sure you're fully logged out
2. Check `sessionStorage.getItem('mediconnect_pending_booking')` after clicking book
3. Clear sessionStorage and try again:
   ```javascript
   sessionStorage.clear();
   ```

---

## ✅ Success Criteria

### All Tests Pass If:
- ✅ You can book an appointment without 500 error
- ✅ "My Appointments" shows your real bookings
- ✅ You can cancel an appointment without JSON error
- ✅ Guest booking saves intent and auto-opens after login
- ✅ All console logs show ✅ success messages
- ✅ No ❌ errors in browser or backend console

---

## 📞 Need More Help?

Check the detailed fix report: [APPOINTMENT_BUGS_FIXED.md](APPOINTMENT_BUGS_FIXED.md)

**Common Questions:**

**Q: How do I reset and test from scratch?**
A: 
```sql
-- Clear all appointments
DELETE FROM Appointments WHERE patientId = YOUR_USER_ID;

-- Clear sessionStorage
sessionStorage.clear();

-- Clear localStorage (logout)
localStorage.clear();
```

**Q: How do I see what data is being sent?**
A: Open **Network tab** in DevTools (F12) → Filter by **Fetch/XHR** → Click on the request → **Payload** tab

**Q: How do I verify the fix worked in the database?**
A:
```sql
-- Check appointments table
SELECT * FROM Appointments ORDER BY createdAt DESC LIMIT 5;

-- Verify doctor details are joined
SELECT a.*, d.name as doctorName 
FROM Appointments a 
LEFT JOIN Doctors d ON a.doctorId = d.id 
WHERE a.patientId = YOUR_USER_ID;
```
