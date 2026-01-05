const getUserIds = async (knex) => {
    const users = await knex('users').select('id').orderBy('id', 'asc');
    return users.map((user) => user.id);
};

const getLeagueId = async (knex) => {
    const league = await knex('leagues').first('id');
    return league.id;
};

module.exports = {
    getUserIds,
    getLeagueId,
};

// No-op seed to satisfy Knex's seed file validation when scanning this directory.
module.exports.seed = async function(knex) { return; };
