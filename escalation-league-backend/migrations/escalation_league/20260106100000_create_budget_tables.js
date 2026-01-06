/**
 * Migration to create budget tracking tables
 * - user_budgets: Tracks user's budget state per league
 * - budget_cards: Individual cards added to user's budget
 */
exports.up = async function (knex) {
    console.log('💰 Creating budget tracking tables...');

    // Create user_budgets table
    await knex.schema.createTable('user_budgets', (table) => {
        table.increments('id').primary();
        table.integer('user_id').unsigned().notNullable();
        table.integer('league_id').unsigned().notNullable();
        table.decimal('budget_used', 10, 2).defaultTo(0.00);
        table.decimal('budget_available', 10, 2).defaultTo(0.00);
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());

        // Foreign keys
        table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
        table.foreign('league_id').references('id').inTable('leagues').onDelete('CASCADE');

        // Unique constraint - one budget per user per league
        table.unique(['user_id', 'league_id'], 'unique_user_league_budget');

        // Indexes
        table.index('user_id', 'idx_user_budgets_user_id');
        table.index('league_id', 'idx_user_budgets_league_id');
    });

    // Create budget_cards table
    await knex.schema.createTable('budget_cards', (table) => {
        table.increments('id').primary();
        table.integer('user_budget_id').unsigned().notNullable();
        table.string('card_name', 255).notNullable();
        table.string('scryfall_id', 255);
        table.integer('quantity').defaultTo(1);
        table.decimal('price_at_addition', 10, 2);
        table.string('set_name', 255);
        table.text('image_uri');
        table.json('card_faces');
        table.integer('week_added');
        table.text('notes');
        table.timestamp('added_at').defaultTo(knex.fn.now());

        // Foreign key
        table.foreign('user_budget_id').references('id').inTable('user_budgets').onDelete('CASCADE');

        // Indexes
        table.index('user_budget_id', 'idx_budget_cards_user_budget_id');
        table.index('card_name', 'idx_budget_cards_card_name');
        table.index('week_added', 'idx_budget_cards_week_added');
    });

    console.log('✅ Budget tables created successfully');
};

exports.down = async function (knex) {
    console.log('💰 Dropping budget tracking tables...');

    await knex.schema.dropTableIfExists('budget_cards');
    await knex.schema.dropTableIfExists('user_budgets');

    console.log('✅ Budget tables dropped successfully');
};
