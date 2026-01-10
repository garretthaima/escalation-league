const { db, clearDatabase } = require('./helpers/dbHelper');

jest.mock('../utils/redisClient', () => ({
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    quit: jest.fn()
}));

// Seed RBAC data once before all tests
async function seedRBAC() {
    console.log('Seeding RBAC data...');

    try {
        // Check if RBAC data already exists
        const existingRoles = await db('roles').count('* as count').first();

        if (existingRoles.count > 0) {
            console.log('✓ RBAC data already seeded, skipping');
            return;
        }

        // Clear RBAC tables first
        await db.raw('SET FOREIGN_KEY_CHECKS = 0');
        await db('role_permissions').del();
        await db('role_hierarchy').del();
        await db('permissions').del();
        await db('roles').del();
        await db.raw('SET FOREIGN_KEY_CHECKS = 1');

        // Run the seed
        const seedRbac = require('../seeds/seed_rbac');
        await seedRbac.seed(db);

        console.log('✓ RBAC data seeded successfully');

        // Verify roles exist
        const roles = await db('roles').select('*');
        console.log('Roles:', roles.map(r => `${r.id}: ${r.name}`));

        // Verify permissions exist
        const permCount = await db('permissions').count('* as count').first();
        console.log(`Permissions: ${permCount.count} total`);

    } catch (err) {
        console.error('Failed to seed RBAC:', err.message);
        throw err;
    }
}

beforeAll(async () => {
    console.log('Setting up test database...');

    // Seed RBAC data (roles, permissions, hierarchy) - only once
    await seedRBAC();

    // Clear test data but keep RBAC seed data
    await clearDatabase();

    console.log('✓ Test database setup complete');
});

afterEach(async () => {
    await clearDatabase();
});

afterAll(async () => {
    console.log('Closing test database connection...');
    await db.destroy();
});

jest.setTimeout(30000);