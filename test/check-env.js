require('dotenv').config();

console.log('=== Environment Variables Check ===\n');
console.log('MICROSOFT_APP_ID length:', process.env.MICROSOFT_APP_ID?.length || 0);
console.log('MICROSOFT_APP_PASSWORD length:', process.env.MICROSOFT_APP_PASSWORD?.length || 0);
console.log('\nAPP_ID empty?', !process.env.MICROSOFT_APP_ID || process.env.MICROSOFT_APP_ID.trim() === '');
console.log('PASSWORD empty?', !process.env.MICROSOFT_APP_PASSWORD || process.env.MICROSOFT_APP_PASSWORD.trim() === '');
console.log('\nAPP_ID first 10 chars:', process.env.MICROSOFT_APP_ID?.substring(0, 10) || 'EMPTY');
console.log('PASSWORD first 10 chars:', process.env.MICROSOFT_APP_PASSWORD?.substring(0, 10) || 'EMPTY');
