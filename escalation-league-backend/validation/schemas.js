const Joi = require('joi');

// Auth validation schemas
const authSchemas = {
    register: Joi.object({
        firstname: Joi.string().min(1).max(100).trim().required()
            .messages({
                'string.min': 'First name is required',
                'string.max': 'First name must be less than 100 characters',
            }),
        lastname: Joi.string().min(1).max(100).trim().required()
            .messages({
                'string.min': 'Last name is required',
                'string.max': 'Last name must be less than 100 characters',
            }),
        email: Joi.string().email().max(255).lowercase().trim().required()
            .messages({
                'string.email': 'Please provide a valid email address',
                'string.max': 'Email must be less than 255 characters',
            }),
        password: Joi.string().min(8).max(128).required()
            .messages({
                'string.min': 'Password must be at least 8 characters',
                'string.max': 'Password must be less than 128 characters',
            }),
    }),

    login: Joi.object({
        email: Joi.string().email().lowercase().trim().required()
            .messages({
                'string.email': 'Please provide a valid email address',
            }),
        password: Joi.string().required()
            .messages({
                'any.required': 'Password is required',
            }),
    }),

    changePassword: Joi.object({
        currentPassword: Joi.string().required(),
        newPassword: Joi.string().min(8).max(128).required()
            .messages({
                'string.min': 'New password must be at least 8 characters',
            }),
    }),
};

// League validation schemas
const leagueSchemas = {
    create: Joi.object({
        name: Joi.string().min(1).max(255).trim().required()
            .messages({
                'string.min': 'League name is required',
                'string.max': 'League name must be less than 255 characters',
            }),
        start_date: Joi.date().iso().required()
            .messages({
                'date.format': 'Start date must be a valid ISO date',
            }),
        end_date: Joi.date().iso().greater(Joi.ref('start_date')).required()
            .messages({
                'date.format': 'End date must be a valid ISO date',
                'date.greater': 'End date must be after start date',
            }),
        description: Joi.string().max(1000).allow('', null),
        max_players: Joi.number().integer().min(2).max(1000).allow(null),
        weekly_budget: Joi.number().min(0).max(1000000).allow(null),
        league_code: Joi.string().max(50).allow('', null),
        number_of_weeks: Joi.number().integer().min(1).max(52).allow(null),
    }),

    update: Joi.object({
        name: Joi.string().min(1).max(255).trim(),
        start_date: Joi.date().iso(),
        end_date: Joi.date().iso(),
        description: Joi.string().max(1000).allow('', null),
        max_players: Joi.number().integer().min(2).max(1000).allow(null),
        weekly_budget: Joi.number().min(0).max(1000000).allow(null),
        current_week: Joi.number().integer().min(0).max(52).allow(null),
        is_active: Joi.boolean(),
        points_per_win: Joi.number().integer().min(0).max(100),
        points_per_loss: Joi.number().integer().min(0).max(100),
        points_per_draw: Joi.number().integer().min(0).max(100),
        number_of_weeks: Joi.number().integer().min(1).max(52).allow(null),
    }).min(1).messages({
        'object.min': 'At least one field is required for update',
    }),
};

// User validation schemas
const userSchemas = {
    updateProfile: Joi.object({
        firstname: Joi.string().min(1).max(100).trim(),
        lastname: Joi.string().min(1).max(100).trim(),
        email: Joi.string().email().max(255).lowercase().trim(),
        current_commander: Joi.string().max(255).allow('', null),
        commander_partner: Joi.string().max(255).allow('', null),
    }).min(1),

    banUser: Joi.object({
        ban_reason: Joi.string().min(1).max(500).required()
            .messages({
                'string.min': 'Ban reason is required',
                'string.max': 'Ban reason must be less than 500 characters',
            }),
    }),

    assignRole: Joi.object({
        roleId: Joi.number().integer().min(1).required()
            .messages({
                'number.min': 'Valid role ID is required',
            }),
    }),
};

// Pod validation schemas
const podSchemas = {
    create: Joi.object({
        leagueId: Joi.number().integer().min(1),
        league_id: Joi.number().integer().min(1),
        player_ids: Joi.array().items(Joi.number().integer().min(1)).min(3).max(6),
        turn_order: Joi.array().items(Joi.number().integer().min(1)),
    }).or('leagueId', 'league_id').messages({
        'object.missing': 'League ID is required',
    }),

    logResult: Joi.object({
        result: Joi.string().valid('win', 'loss', 'draw').allow(null),
    }),
};

// ID parameter validation
const idParam = Joi.object({
    id: Joi.number().integer().min(1).required(),
});

const podIdParam = Joi.object({
    podId: Joi.number().integer().min(1).required(),
});

const userIdParam = Joi.object({
    userId: Joi.number().integer().min(1).required(),
});

const leagueIdParam = Joi.object({
    leagueId: Joi.number().integer().min(1).required(),
});

module.exports = {
    authSchemas,
    leagueSchemas,
    userSchemas,
    podSchemas,
    idParam,
    podIdParam,
    userIdParam,
    leagueIdParam,
};
