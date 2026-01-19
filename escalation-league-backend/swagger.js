const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Escalation League API',
            version: '1.0.0',
            description: 'API documentation for the Escalation League Commander tracking application',
        },
        servers: [
            {
                url: '/api',
                description: 'API server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        message: { type: 'string' },
                    },
                },
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        username: { type: 'string' },
                        email: { type: 'string' },
                        firstname: { type: 'string' },
                        lastname: { type: 'string' },
                        picture: { type: 'string' },
                        is_active: { type: 'boolean' },
                    },
                },
                League: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        start_date: { type: 'string', format: 'date' },
                        end_date: { type: 'string', format: 'date' },
                        is_active: { type: 'boolean' },
                        max_players: { type: 'integer' },
                        current_week: { type: 'integer' },
                    },
                },
                Pod: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        league_id: { type: 'integer' },
                        confirmation_status: {
                            type: 'string',
                            enum: ['open', 'active', 'pending', 'complete'],
                        },
                        created_at: { type: 'string', format: 'date-time' },
                        participants: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/GamePlayer' },
                        },
                    },
                },
                GamePlayer: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        player_id: { type: 'integer' },
                        pod_id: { type: 'integer' },
                        result: {
                            type: 'string',
                            enum: ['win', 'loss', 'draw', 'disqualified'],
                        },
                        turn_order: { type: 'integer' },
                        confirmed: { type: 'boolean' },
                    },
                },
                GameSession: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        league_id: { type: 'integer' },
                        session_date: { type: 'string', format: 'date' },
                        name: { type: 'string' },
                        status: {
                            type: 'string',
                            enum: ['scheduled', 'active', 'completed'],
                        },
                    },
                },
                UserLeague: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        user_id: { type: 'integer' },
                        league_id: { type: 'integer' },
                        league_wins: { type: 'integer' },
                        league_losses: { type: 'integer' },
                        current_commander: { type: 'string' },
                        commander_partner: { type: 'string' },
                        decklist_url: { type: 'string' },
                    },
                },
            },
        },
        tags: [
            { name: 'Auth', description: 'Authentication endpoints' },
            { name: 'Users', description: 'User management' },
            { name: 'Leagues', description: 'League operations' },
            { name: 'User Leagues', description: 'League participation' },
            { name: 'Pods', description: 'Game pod management' },
            { name: 'Attendance', description: 'Session attendance' },
            { name: 'Budgets', description: 'Budget tracking' },
            { name: 'Metagame', description: 'Analytics and statistics' },
            { name: 'Awards', description: 'Awards system' },
            { name: 'Admin', description: 'Administrative functions' },
        ],
    },
    apis: ['./routes/*.js'],
};

const specs = swaggerJsdoc(options);

module.exports = { swaggerUi, specs };
