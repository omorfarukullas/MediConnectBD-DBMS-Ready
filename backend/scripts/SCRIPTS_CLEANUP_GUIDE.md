# Scripts Folder Cleanup and Reorganization

## Current Database: mediconnectbdv2 (Faker.js Data)

### ✅ KEEP - Active Faker.js Seeders (New System)
These are the CURRENT seeders that populate the database with faker.js data:

**Seeders (Keep All):**
- `seeders/masterSeed.js` - Main seeder orchestrator (NEW)
- `seeders/seedUsers.js` - Seeds users with faker.js
- `seeders/seedHospitals.js` - Seeds hospitals
- `seeders/seedDoctors.js` - Seeds 30 doctors
- `seeders/seedPatients.js` - Seeds 100 patients
- `seeders/seedDoctorSlots.js` - Seeds 252 slots
- `seeders/seedAppointments.js` - Seeds 75 appointments
- `seeders/seedMedicalRecords.js` - Seeds medical records
- `seeders/seedReviews.js` - Seeds reviews

**Run with:** `node backend/scripts/seeders/masterSeed.js`

---

### ❌ DELETE - Old Database Scripts (Previous Version)
These scripts were created for the OLD database and should be deleted:

**Old Setup/Migration Scripts:**
- `clearDatabase.js` - Old database clearer
- `initializeDatabase.js` - Old database initializer
- `setup-database.js` - Old setup script
- `run-migration.js` - Old migration
- `run-safe-migration.js` - Old migration
- `run-complete-setup.js` - Old complete setup
- `run-add-docs.js` - Old doc adder

**Old Test Scripts (for old database):**
- `setup-test-doctor.js` - Old test doctor setup
- `test_appointment_full.js` - Old appointment test
- `test_full_booking_flow.js` - Old booking flow test
- `comprehensive-test.js` - Old comprehensive test

**Old Check Scripts:**
- `check-data.js` - Old data checker
- `check-schema.js` - Old schema checker
- `verify-setup.js` - Old setup verifier

---

### ⚠️ REVIEW - Scripts I Created (Should be Deleted/Replaced)
These are scripts I created during our debugging session (not part of faker.js system):

- `check_queue_prerequisites.js` - Debugging script
- `create_test_appointments.js` - Created test data (conflicts with faker.js)
- `check_appointment_dates.js` - Temporary check script
- `find_doctor_with_queue.js` - Debugging script
- `get_doctor_for_queue_test.js` - Debugging script (has schema errors)

---

### ✅ KEEP - Useful Test/Debug Scripts
Keep these for testing specific features:

- `test_queue_tracking.js` - Tests queue system
- `test_appointment_cancellation.js` - Tests cancellation
- `test_get_appointments.js` - Tests appointment retrieval
- `check_db_slots.js` - Quick slot checker
- `run_seeder_adhoc.js` - Runs seeders on demand
- `seeders/test_seed.js` - Test seeder

---

## Recommended Actions

### 1. Delete Old Scripts
```bash
cd backend/scripts
rm clearDatabase.js initializeDatabase.js setup-database.js
rm run-migration.js run-safe-migration.js run-complete-setup.js run-add-docs.js
rm setup-test-doctor.js test_appointment_full.js test_full_booking_flow.js comprehensive-test.js
rm check-data.js check-schema.js verify-setup.js
```

### 2. Delete My Debugging Scripts
```bash
rm check_queue_prerequisites.js create_test_appointments.js check_appointment_dates.js
rm find_doctor_with_queue.js get_doctor_for_queue_test.js
```

### 3. Create New Utility Scripts (If Needed)
I'll create clean, new scripts specifically for the faker.js database.

---

## New Database Status (Faker.js - mediconnectbdv2)

**Data Counts:**
- Users: 142 (100 patients + 30 doctors + 10 admins + 2 super admins)
- Doctors: 30
- Patients: 100
- Hospitals: 15
- Doctor Slots: 252
- Appointments: 75
- Appointments Today (2026-01-23): 3

**Test Login:**
- Email: `test@gmail.com` (Dr Test)
- Password: `password123` (default for all faker.js users)
- Or: `superadmin@mediconnect.com` / `password123`

---

## Scripts to Create Fresh

I'll create new, clean scripts specifically for the faker.js database that don't conflict with the seeder system.
