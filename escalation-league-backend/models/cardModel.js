const knex = require('../knexfile.js').scryfall;

class Card {
    static async getById(id) {
        return knex('cards').where({ id }).first();
    }

    static async getByOracleId(oracleId) {
        return knex('cards').where({ oracle_id: oracleId }).first();
    }

    static async searchByName(name) {
        return knex('cards').where('name', 'like', `%${name}%`);
    }
}

module.exports = Card;