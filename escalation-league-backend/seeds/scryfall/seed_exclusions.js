exports.seed = async function (knex) {
  // Deletes ALL existing entries
  await knex('exclusions').del();

  // Inserts seed entries
  await knex('exclusions').insert([
    { set: 'sum', set_name: 'Summer Magic / Edgar', reason: 'No recent sales data' },
    { set_type: 'memorabilia', reason: 'Not tournament legal' },
    { border_color: 'gold', reason: 'Collector-only cards' },
    { type_line: 'Basic Land%', reason: 'Excluded from price checks' },
  ]);
};