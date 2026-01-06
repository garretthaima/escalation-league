exports.up = async function (knex) {
    // Insert default exclusions
    await knex('exclusions').insert([
        {
            set: 'sum',
            set_name: 'Summer Magic / Edgar',
            reason: 'No recent sales data'
        },
        {
            set_type: 'memorabilia',
            reason: 'Not tournament legal'
        },
        {
            border_color: 'gold',
            reason: 'Collector-only cards'
        },
        {
            type_line: 'Basic Land%',
            reason: 'Excluded from price checks'
        },
    ]);
};

exports.down = async function (knex) {
    // Remove the default exclusions
    await knex('exclusions').whereIn('set', ['sum']).del();
    await knex('exclusions').whereIn('set_type', ['memorabilia']).del();
    await knex('exclusions').whereIn('border_color', ['gold']).del();
    await knex('exclusions').where('type_line', 'like', 'Basic Land%').del();
};
