exports.up = async function (knex) {
    await knex.schema.alterTable('game_players', (table) => {
        table.unique(['pod_id', 'player_id']);
    });
};

exports.down = async function (knex) {
    await knex.schema.alterTable('game_players', (table) => {
        table.dropUnique(['pod_id', 'player_id']);
    });
};