const knex = require('../knexfile.js').scryfall;

class Ruling {
    static async getByOracleId(oracleId) {
        return knex('rulings').where({ oracle_id: oracleId }).orderBy('published_at', 'asc');
    }

    static async getRecentRulings(sinceDate) {
        return knex('rulings').where('published_at', '>=', sinceDate).orderBy('published_at', 'desc');
    }
}

module.exports = Ruling;