const bcrypt = require('bcrypt');

/**
 * Seed development users
 * Includes your OAuth account + 7 dummy users
 */
exports.seed = async function (knex) {
  console.log('👥 Seeding users...');
  
  // Get role IDs
  const roles = await knex('roles').select('id', 'name');
  const roleMap = Object.fromEntries(roles.map((role) => [role.name, role.id]));
  
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  // Insert your OAuth account + dummy users
  await knex('users').insert([
    { 
      email: 'garretthaima@gmail.com', 
      firstname: 'Garrett', 
      lastname: 'Haima', 
      role_id: roleMap['super_admin'],
      google_id: 'test_google_id' // OAuth marker
    },
    { email: 'alice@example.com', firstname: 'Alice', lastname: 'Johnson', role_id: roleMap['league_user'], password: hashedPassword },
    { email: 'bob@example.com', firstname: 'Bob', lastname: 'Doe', role_id: roleMap['league_user'], password: hashedPassword },
    { email: 'charlie@example.com', firstname: 'Charlie', lastname: 'Smith', role_id: roleMap['league_user'], password: hashedPassword },
    { email: 'david@example.com', firstname: 'David', lastname: 'Brown', role_id: roleMap['league_user'], password: hashedPassword },
    { email: 'eve@example.com', firstname: 'Eve', lastname: 'White', role_id: roleMap['league_user'], password: hashedPassword },
    { email: 'frank@example.com', firstname: 'Frank', lastname: 'Green', role_id: roleMap['league_user'], password: hashedPassword },
    { email: 'grace@example.com', firstname: 'Grace', lastname: 'Blue', role_id: roleMap['league_user'], password: hashedPassword },
  ]);
  
  console.log('✓ Users seeded (8 total including garretthaima@gmail.com)');
};
