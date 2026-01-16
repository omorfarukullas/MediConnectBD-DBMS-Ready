const bcrypt = require('bcryptjs');

const hashedPassword = '$2a$10$ukOZmUDjsPQJkpDsFc6vQeTWOeU424A3RyEIOTMdoulZwZqyRdzte';
const testPassword = 'Ullas786.';

async function test() {
    const match = await bcrypt.compare(testPassword, hashedPassword);
    console.log(`Testing password: "${testPassword}"`);
    console.log(`Result: ${match ? '✅ PASSWORD MATCHES!' : '❌ PASSWORD DOES NOT MATCH'}`);
    
    if (match) {
        console.log('\n✅ The password is correct! Login should work.');
        console.log('If login still fails, check the backend debug logs.');
    } else {
        console.log('\n❌ This password does not match the hash in database.');
        console.log('The password may have been different during registration.');
    }
}

test();
