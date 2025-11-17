require('dotenv').config();

console.log('=== Environment Variables Check ===\n');

console.log('MICROSOFT_APP_ID length:', process.env.MICROSOFT_APP_ID?.length || 0);
console.log('MICROSOFT_APP_PASSWORD length:', process.env.MICROSOFT_APP_PASSWORD?.length || 0);
console.log('MICROSOFT_APP_TYPE:', process.env.MICROSOFT_APP_TYPE || 'Not set (defaults to MultiTenant)');
console.log('MICROSOFT_APP_TENANT_ID:', process.env.MICROSOFT_APP_TENANT_ID || 'Not set (optional)');

console.log('\nAPP_ID empty?', !process.env.MICROSOFT_APP_ID || process.env.MICROSOFT_APP_ID.trim() === '');
console.log('PASSWORD empty?', !process.env.MICROSOFT_APP_PASSWORD || process.env.MICROSOFT_APP_PASSWORD.trim() === '');

console.log('\nAPP_ID first 10 chars:', process.env.MICROSOFT_APP_ID?.substring(0, 10) || 'EMPTY');
console.log('PASSWORD first 10 chars:', process.env.MICROSOFT_APP_PASSWORD?.substring(0, 10) || 'EMPTY');

if (process.env.MICROSOFT_APP_TENANT_ID) {
  console.log('TENANT_ID first 10 chars:', process.env.MICROSOFT_APP_TENANT_ID.substring(0, 10));
}

console.log('\n=== Configuration Validation ===\n');

const appType = process.env.MICROSOFT_APP_TYPE || 'MultiTenant';
if (appType === 'SingleTenant' && !process.env.MICROSOFT_APP_TENANT_ID) {
  console.log('⚠️  WARNING: MICROSOFT_APP_TYPE is SingleTenant but MICROSOFT_APP_TENANT_ID is not set');
  console.log('   For SingleTenant apps, MICROSOFT_APP_TENANT_ID is required.');
} else if (appType === 'SingleTenant' && process.env.MICROSOFT_APP_TENANT_ID) {
  console.log('✓ SingleTenant configuration is valid (TenantId set)');
} else if (appType === 'MultiTenant') {
  console.log('✓ MultiTenant configuration (TenantId is optional)');
} else if (appType === 'UserAssignedMSI') {
  console.log('✓ UserAssignedMSI configuration');
}
