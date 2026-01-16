/**
 * Seed Test Users Script
 * Creates test accounts for each role (PATIENT, DOCTOR, ADMIN, SUPER_ADMIN)
 * Run with: node seedTestUsers.js
 */

const bcrypt = require('bcryptjs');
const { User, Doctor } = require('./models');
const db = require('./config/db');

const testUsers = [
  {
    name: 'Test Patient',
    email: 'patient@test.com',
    phone: '01700000001',
    password: 'password123',
    role: 'PATIENT',
    age: 30,
    gender: 'Male'
  },
  {
    name: 'Dr. Test Doctor',
    email: 'doctor@test.com',
    phone: '01700000002',
    password: 'password123',
    role: 'DOCTOR',
    age: 40,
    gender: 'Male',
    // Doctor-specific fields
    bmdcNumber: 'A-12345',
    specialization: 'General Medicine',
    experience: 10,
    consultationFee: 1000,
    degrees: 'MBBS, FCPS'
  },
  {
    name: 'Hospital Admin',
    email: 'admin@test.com',
    phone: '01700000003',
    password: 'password123',
    role: 'ADMIN',
    age: 35,
    gender: 'Female'
    // hospitalId will be set when hospital functionality is implemented
  },
  {
    name: 'Super Admin',
    email: 'superadmin@test.com',
    phone: '01700000004',
    password: 'password123',
    role: 'SUPER_ADMIN',
    age: 45,
    gender: 'Male'
  }
];

async function seedUsers() {
  try {
    console.log('🌱 Starting user seeding...');

    // Test database connection
    await db.authenticate();
    console.log('✅ Database connected');

    for (const userData of testUsers) {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email: userData.email } });
      
      if (existingUser) {
        console.log(`⚠️  User ${userData.email} already exists, skipping...`);
        continue;
      }

      // Create user
      const user = await User.create({
        ...userData,
        password: hashedPassword
      });

      // If doctor, create doctor profile entry
      if (userData.role === 'DOCTOR') {
        await Doctor.create({
          userId: user.id,
          bmdcNumber: userData.bmdcNumber || 'A-00000',
          specialization: userData.specialization || 'General Medicine',
          experienceYears: userData.experience || 0,
          hospitalName: userData.hospital || 'Test Hospital',
          feesOnline: userData.consultationFee ? userData.consultationFee * 0.8 : 800,
          feesPhysical: userData.consultationFee || 1000,
          education: userData.degrees ? [userData.degrees] : ['MBBS'],
          rating: 0,
          isVerified: true, // Auto-verify test doctor
          status: 'Active',
          available: true
        });
        console.log(`✅ Created doctor profile for ${userData.name}`);
      }

      console.log(`✅ Created ${userData.role}: ${userData.email} (password: ${userData.password})`);
    }

    console.log('\n🎉 Seeding completed successfully!');
    console.log('\n📋 Test Accounts:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    testUsers.forEach(u => {
      console.log(`${u.role.padEnd(15)} | ${u.email.padEnd(25)} | password123`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    process.exit(1);
  }
}

// Run the seeder
seedUsers();
