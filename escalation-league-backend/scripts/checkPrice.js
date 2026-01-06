const scryfallDb = require('../models/scryfallDb');

scryfallDb('cards')
    .select('set_code', 'collector_number', 'set_name',
        scryfallDb.raw('JSON_EXTRACT(prices, "$.usd") AS usd'),
        scryfallDb.raw('JSON_EXTRACT(prices, "$.usd_foil") AS usd_foil'),
        scryfallDb.raw('JSON_EXTRACT(prices, "$.usd_etched") AS usd_etched'))
    .where('name', 'Force of Will')
    .andWhere('collector_number', '284')
    .then(rows => {
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
