require('dotenv').config();
const bcrypt = require('bcrypt');
const { getUserIds, getLeagueId } = require('./helpers');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // Clear existing data in the correct order
  await knex('game_players').del(); // Delete rows from game_players first
  await knex('user_leagues').del(); // Then delete rows from user_leagues
  await knex('users').del(); // Clear the table
  await knex.raw('ALTER TABLE users AUTO_INCREMENT = 1'); // Reset the auto-increment counter

  // Fetch role IDs from the roles table
  const roles = await knex('roles').select('id', 'name');
  const roleMap = Object.fromEntries(roles.map((role) => [role.name, role.id]));

  // Fetch league ID
  const leagueId = await getLeagueId(knex);

  // Use a fallback value if SECRET_KEY is not defined
  const adminPassword = process.env.SECRET_KEY;

  // Generate hashed passwords
  const hashedAdminPassword = await bcrypt.hash(adminPassword, 10); // Admin's hashed password

  const hashedPassword1 = await bcrypt.hash('password123', 10); // Alice's password
  const hashedPassword2 = await bcrypt.hash('password123', 10); // Bob's password
  const hashedPassword3 = await bcrypt.hash('password123', 10); // Charlie's password
  const hashedPassword4 = await bcrypt.hash('password123', 10); // David's password
  const hashedPassword5 = await bcrypt.hash('password123', 10); // Eve's password
  const hashedPassword6 = await bcrypt.hash('password123', 10); // Frank's password
  const hashedPassword7 = await bcrypt.hash('password123', 10); // Grace's password
  const hashedPassword8 = await bcrypt.hash('password123', 10); // Hannah's password

  // Insert users with role IDs and hashed passwords
  await knex('users').insert([
    { id: 1, email: 'admin@escalationleague.com', firstname: 'Admin', lastname: 'User', role_id: roleMap['super_admin'], password: hashedAdminPassword },
    { id: 2, email: 'alice@example.com', firstname: 'Alice', lastname: 'Johnson', role_id: roleMap['league_user'], password: hashedPassword1 },
    { id: 3, email: 'bob@example.com', firstname: 'John', lastname: 'Doe', role_id: roleMap['league_user'], password: hashedPassword2 },
    { id: 4, email: 'charlie@example.com', firstname: 'Jane', lastname: 'Smith', role_id: roleMap['league_user'], password: hashedPassword3 },
    { id: 5, email: 'david@example.com', firstname: 'David', lastname: 'Brown', role_id: roleMap['league_user'], password: hashedPassword4 },
    { id: 6, email: 'eve@example.com', firstname: 'Eve', lastname: 'White', role_id: roleMap['league_user'], password: hashedPassword5 },
    { id: 7, email: 'frank@example.com', firstname: 'Frank', lastname: 'Black', role_id: roleMap['league_user'], password: hashedPassword6 },
    { id: 8, email: 'grace@example.com', firstname: 'Grace', lastname: 'Green', role_id: roleMap['league_user'], password: hashedPassword7 },
    { id: 9, email: 'hannah@example.com', firstname: 'Hannah', lastname: 'Blue', role_id: roleMap['league_user'], password: hashedPassword8 },
    { id: 10, email: 'garretthaima@gmail.com', firstname: 'Garrett', lastname: 'Haima', role_id: roleMap['user'] },
  ]);

  // Fetch the inserted user IDs
  const [userId1, userId2, userId3, userId4, userId5, userId6, userId7, userId8, userId9, userId10] = await getUserIds(knex);

  // Associate some users with the league
  await knex('user_leagues').insert([
    { user_id: userId2, league_id: leagueId, league_wins: 0, league_losses: 0 },
    { user_id: userId3, league_id: leagueId, league_wins: 0, league_losses: 0 },
    { user_id: userId4, league_id: leagueId, league_wins: 0, league_losses: 0 },
    { user_id: userId5, league_id: leagueId, league_wins: 0, league_losses: 0 },
    { user_id: userId6, league_id: leagueId, league_wins: 0, league_losses: 0 },
  ]);

  console.log('Users seeded successfully!');
};