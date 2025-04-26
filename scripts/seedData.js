const db = require('../config/dbConfig');

const seedData = async () => {
    try {
        console.log('Seeding data...');

        // Clear existing data
        console.log('Clearing existing data...');
        await db.query('DELETE FROM game_players');
        await db.query('DELETE FROM games');
        await db.query('DELETE FROM users');
        await db.query('DELETE FROM leagues');
        console.log('Existing data cleared.');

        // Insert dummy leagues
        const leagues = [
            ['Spring League', '2025-01-01', '2025-04-30', null, 5, 500.00], // Past league
            ['Summer League', '2025-05-01', '2025-08-31', null, 16, 1000.00], // Past league
            ['Fall League', '2025-09-01', '2025-12-31', null, 16, 800.00], // Past league
            ['Winter League', '2026-01-01', '2026-04-30', 1, 2, 200.00], // Active league
        ];
        console.log('Inserting leagues...');
        await db.query(
            'INSERT INTO leagues (name, start_date, end_date, is_active, current_week, money_accumulated) VALUES ?',
            [leagues]
        );
        console.log('Leagues inserted successfully.');

        // Fetch league IDs
        const [leagueRows] = await db.query('SELECT id, name FROM leagues');
        const leagueMap = Object.fromEntries(leagueRows.map((league) => [league.name, league.id]));
        console.log('Fetched league IDs:', leagueMap);

        // Insert dummy users
        const bcrypt = require('bcrypt');

        const users = [
            ['admin', await bcrypt.hash('admin_password', 10), 0, 0, 'admin'], // Admin user
            ['user1', await bcrypt.hash('password1', 10), 10, 5, 'user'], // Regular user
            ['user2', await bcrypt.hash('password2', 10), 8, 7, 'user'], // Regular user
            ['user3', await bcrypt.hash('password3', 10), 15, 3, 'user'], // Regular user
            ['user4', await bcrypt.hash('password4', 10), 5, 10, 'user'], // Regular user
            ['user5', await bcrypt.hash('password5', 10), 12, 4, 'user'], // Regular user
            ['user6', await bcrypt.hash('password6', 10), 7, 8, 'user'], // Regular user
        ];
        console.log('Inserting users...');
        await db.query('INSERT INTO users (username, password, wins, losses, role) VALUES ?', [users]);
        console.log('Users inserted successfully.');

        // Fetch user IDs
        const [userRows] = await db.query('SELECT id, username FROM users');
        const userMap = Object.fromEntries(userRows.map((user) => [user.username, user.id]));
        console.log('Fetched user IDs:', userMap);

        // Insert dummy games
        const games = [
            [userMap['user1'], 'win', '2025-04-01', 'checkmate', leagueMap['Spring League']],
            [userMap['user2'], 'loss', '2025-04-02', 'timeout', leagueMap['Spring League']],
            [userMap['user3'], 'win', '2025-04-03', 'resignation', leagueMap['Spring League']],
            [userMap['user4'], 'loss', '2025-04-04', 'timeout', leagueMap['Spring League']],
        ];
        console.log('Inserting games...');
        await db.query(
            'INSERT INTO games (creator_id, result, date, win_condition, league_id) VALUES ?',
            [games]
        );
        console.log('Games inserted successfully.');

        console.log('Dummy data inserted successfully.');
    } catch (err) {
        console.error('Error seeding data:', err.message);
    } finally {
        db.end();
    }
};

seedData();