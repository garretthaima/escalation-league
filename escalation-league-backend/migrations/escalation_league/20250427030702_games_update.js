exports.up = async function (knex) {
    // Add pod_id to games table if it doesn't already exist
    const hasPodId = await knex.schema.hasColumn('games', 'pod_id');
    if (!hasPodId) {
        await knex.schema.table('games', (table) => {
            table.integer('pod_id').unsigned().notNullable().after('id');
            table.foreign('pod_id').references('id').inTable('game_pods').onDelete('CASCADE');
        });
    }

    // Ensure game_id in game_players is unsigned and nullable
    const hasGameId = await knex.schema.hasColumn('game_players', 'game_id');
    if (hasGameId) {
        await knex.schema.alterTable('game_players', (table) => {
            table.integer('game_id').unsigned().nullable().alter();
        });
    }
};

exports.down = async function (knex) {
    // Remove pod_id from games table if it exists
    const hasPodId = await knex.schema.hasColumn('games', 'pod_id');
    if (hasPodId) {
        await knex.schema.table('games', (table) => {
            table.dropColumn('pod_id');
        });
    }

    // Revert game_id in game_players to not nullable
    const hasGameId = await knex.schema.hasColumn('game_players', 'game_id');
    if (hasGameId) {
        await knex.schema.alterTable('game_players', (table) => {
            table.integer('game_id').unsigned().notNullable().alter();
        });
    }
};