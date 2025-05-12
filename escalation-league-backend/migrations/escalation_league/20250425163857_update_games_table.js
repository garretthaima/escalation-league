exports.up = async function (knex) {
    await knex.schema.raw(`
        ALTER TABLE games MODIFY result ENUM('win', 'loss', 'draw') NOT NULL;
    `);
};

exports.down = async function (knex) {
    await knex.schema.raw(`
        ALTER TABLE games MODIFY result ENUM('win', 'loss') NOT NULL;
    `);
};