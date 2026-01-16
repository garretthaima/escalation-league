/**
 * Add custom_message column to attendance_polls table
 * This preserves the custom message when the poll embed is updated
 */
exports.up = async function(knex) {
    const hasCustomMessage = await knex.schema.hasColumn('attendance_polls', 'custom_message');
    if (!hasCustomMessage) {
        await knex.schema.alterTable('attendance_polls', (table) => {
            table.text('custom_message').nullable();
        });
    }
};

exports.down = async function(knex) {
    const hasCustomMessage = await knex.schema.hasColumn('attendance_polls', 'custom_message');
    if (hasCustomMessage) {
        await knex.schema.alterTable('attendance_polls', (table) => {
            table.dropColumn('custom_message');
        });
    }
};
