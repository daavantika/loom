// Compile-time role union spanning both databases: COOK/CUSTOMER rows live in
// the user DB's `users` table, ADMIN rows live in the admin DB's `admin_users`
// table. This type is not a DB binding — just shared type safety for JWT
// payloads and @Roles()/RolesGuard checks.
export type UserRole = 'COOK' | 'ADMIN' | 'CUSTOMER';
