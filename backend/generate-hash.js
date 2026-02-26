// Generate password hash for admin user
const bcrypt = require('bcryptjs');

const password = process.argv[2] || 'admin123';
const hash = bcrypt.hashSync(password, 10);

console.log('\n=== Admin Password Hash Generator ===\n');
console.log('Password:', password);
console.log('Hash:', hash);
console.log('\nCopy the hash above and use it in your Supabase SQL query:');
console.log('\nUPDATE users');
console.log("SET password_hash = '" + hash + "'");
console.log("WHERE username = 'admin';");
console.log('\n');
