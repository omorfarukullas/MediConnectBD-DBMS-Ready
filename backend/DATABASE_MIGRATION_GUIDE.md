# Database Migration Guide
## From JavaScript Models to SQL Schema

### 📋 Overview
This guide explains how to migrate your MediConnect BD database from JavaScript/Sequelize model definitions to pure SQL schema files.

---

## ✅ What Changed

### Before (JavaScript Models)
- Database schema defined in **JavaScript files** (`/backend/models/*.js`)
- Using **Sequelize ORM** for model definitions
- Schema scattered across multiple files
- Hard to version control database changes

### After (SQL Schema)
- Database schema defined in **SQL file** (`/backend/schema_complete.sql`)
- Pure SQL `CREATE TABLE` statements
- All tables in one centralized file
- Easy to import/export and version control

---

## 📂 Files Overview

### New Files Created:
1. **`schema_complete.sql`** - Complete database schema with all tables
   - Contains all 14 tables
   - Includes sample data
   - Has foreign key relationships
   - Optimized indexes

### Old Files (No Longer Used):
- `models/User.js` - Replaced by SQL `users` and `patients` tables
- `models/Doctor.js` - Replaced by SQL `doctors` table
- `models/Hospital.js` - Replaced by SQL `hospitals` table
- `models/Appointment.js` - Replaced by SQL `appointments` table
- `models/Review.js` - Replaced by SQL `reviews` table
- `models/DoctorSchedule.js` - Replaced by SQL `doctor_schedules` table
- `models/Notification.js` - Replaced by SQL `notifications` table
- `models/MedicalDocument.js` - Replaced by SQL `medical_documents` table
- `models/Prescription.js` - Replaced by SQL `prescriptions` table
- `models/MedicalReport.js` - Replaced by SQL `medical_reports` table
- `models/Vitals.js` - Replaced by SQL `vitals` table
- `models/Ambulance.js` - Replaced by SQL `ambulances` table

---

## 🗄️ Complete Database Schema

### Tables Included:

| # | Table Name | Description |
|---|------------|-------------|
| 1 | `users` | Base user authentication table |
| 2 | `hospitals` | Hospital information |
| 3 | `patients` | Patient profiles and details |
| 4 | `doctors` | Doctor profiles with specializations |
| 5 | `appointments` | Appointment bookings |
| 6 | `doctor_schedules` | Doctor availability schedules |
| 7 | `reviews` | Patient reviews for doctors |
| 8 | `notifications` | User notifications |
| 9 | `medical_documents` | Uploaded medical files metadata |
| 10 | `prescriptions` | Doctor-issued prescriptions |
| 11 | `medical_reports` | Lab reports and test results |
| 12 | `vitals` | Patient vital signs |
| 13 | `ambulances` | Ambulance service information |

---

## 🚀 How to Apply the Schema

### Option 1: Using phpMyAdmin (Recommended for XAMPP)

1. **Open phpMyAdmin**
   - URL: `http://localhost/phpmyadmin`
   
2. **Backup Existing Data (Important!)**
   - Select `mediconnect` database
   - Click **Export** tab
   - Click **Go** to download backup
   - Save file as `mediconnect_backup_YYYYMMDD.sql`

3. **Drop and Recreate Database**
   ```sql
   DROP DATABASE IF EXISTS mediconnect;
   CREATE DATABASE mediconnect CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

4. **Import New Schema**
   - Select the `mediconnect` database
   - Click **Import** tab
   - Choose file: `backend/schema_complete.sql`
   - Click **Go**

5. **Verify Import**
   - Check that all 13 tables appear in left sidebar
   - Check sample data exists (3 patients, 3 doctors, 3 appointments)

### Option 2: Using MySQL Command Line

```bash
# Navigate to backend directory
cd C:\Users\omorf\MediConnectBD\MediConnect-BD3.0\backend

# Import schema
mysql -u root -p mediconnect < schema_complete.sql
```

### Option 3: Using PowerShell

```powershell
# Navigate to MySQL bin directory
cd C:\xampp\mysql\bin

# Drop and recreate database
.\mysql.exe -u root -e "DROP DATABASE IF EXISTS mediconnect; CREATE DATABASE mediconnect;"

# Import schema
.\mysql.exe -u root mediconnect < "C:\Users\omorf\MediConnectBD\MediConnect-BD3.0\backend\schema_complete.sql"
```

---

## 🔍 Verify Migration Success

### Check Tables
```sql
USE mediconnect;
SHOW TABLES;
```

Expected output (13 tables):
```
ambulances
appointments
doctor_schedules
doctors
hospitals
medical_documents
medical_reports
notifications
patients
prescriptions
reviews
users
vitals
```

### Check Sample Data
```sql
-- Count records
SELECT 'Patients' as table_name, COUNT(*) as count FROM patients
UNION ALL
SELECT 'Doctors', COUNT(*) FROM doctors
UNION ALL
SELECT 'Appointments', COUNT(*) FROM appointments;
```

Expected output:
```
Patients: 3
Doctors: 3
Appointments: 3
```

---

## ⚠️ Important Notes

### Foreign Key Relationships
The schema includes proper foreign key constraints:
- `appointments.patient_id` → `patients.id`
- `appointments.doctor_id` → `doctors.id`
- `reviews.patient_id` → `patients.id`
- `reviews.doctor_id` → `doctors.id`
- And more...

### Data Types
All fields use appropriate MySQL data types:
- `VARCHAR` for strings
- `INT` for integers
- `DECIMAL` for money/precise numbers
- `ENUM` for fixed choices
- `TEXT` for long content
- `TIMESTAMP` for dates with auto-update

### Indexes
Optimized indexes on:
- Primary keys (automatic)
- Foreign keys
- Search fields (city, specialization, name)
- Date fields
- Status fields

---

## 🎯 Next Steps

1. ✅ Import `schema_complete.sql` into XAMPP MySQL
2. ✅ Verify all tables created successfully
3. ✅ Test backend API endpoints
4. ✅ Update any remaining controllers to use raw SQL
5. ✅ Remove old Sequelize model files (optional)

---

## 🆘 Troubleshooting

### Error: "Table already exists"
- The schema drops tables first, but if it fails:
  ```sql
  SET FOREIGN_KEY_CHECKS = 0;
  DROP DATABASE mediconnect;
  CREATE DATABASE mediconnect;
  SET FOREIGN_KEY_CHECKS = 1;
  ```

### Error: "Foreign key constraint fails"
- Make sure tables are created in correct order (schema handles this)
- Check that referenced tables exist before creating dependent tables

### Missing Data
- The schema includes sample data at the end
- If data missing, re-run the INSERT statements from schema file

---

## 📚 Sample Login Credentials

**Patients:**
- Email: `john.smith@email.com` | Password: `password123`
- Email: `sarah.johnson@email.com` | Password: `password123`
- Email: `michael.williams@email.com` | Password: `password123`

**Doctors:**
- Email: `emily.chen@hospital.com` | Password: `password123`
- Email: `robert.martinez@hospital.com` | Password: `password123`
- Email: `lisa.anderson@hospital.com` | Password: `password123`

(All passwords are hashed with bcrypt - plaintext is `password123`)

---

## ✅ Migration Complete!

Your database is now fully defined in SQL files instead of JavaScript models. This provides:
- Better version control
- Easier database portability
- Clearer schema documentation
- Direct SQL execution without ORM overhead
