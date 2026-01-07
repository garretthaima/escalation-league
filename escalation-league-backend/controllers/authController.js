const bcrypt = require('bcrypt');
const db = require('../models/db');
const { OAuth2Client } = require('google-auth-library');
const { generateToken } = require('../utils/tokenUtils');
const { handleError } = require('../utils/errorUtils');
const { getSetting } = require('../utils/settingsUtils');
const logger = require('../utils/logger');


// Register User
const registerUser = async (req, res) => {
    const { firstname, lastname, email, password } = req.body;

    logger.info('User registration attempt', { email, firstname, lastname });

    try {
        // Fetch the default role 'league_user'
        const leagueUserRole = await db('roles').select('id').where({ name: 'league_user' }).first();

        if (!leagueUserRole) {
            logger.error('Default role not found during registration', null, { email });
            return res.status(500).json({ error: 'Default role "league_user" not found in the database.' });
        }

        // Hash the password before storing it
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the user into the database with default role
        const [userId] = await db('users').insert({
            firstname,
            lastname,
            email,
            password: hashedPassword,
            role_id: leagueUserRole.id, // Assign default league_user role
        });

        logger.info('User registered successfully', { userId, email, roleId: leagueUserRole.id });

        // Send a success response
        res.status(201).json({ success: true, userId });
    } catch (err) {
        // Handle duplicate email error (MySQL error code 1062)
        if (err.code === 'ER_DUP_ENTRY') {
            logger.warn('Registration failed - duplicate email', { email });
            return res.status(400).json({ error: 'Email is already registered.' });
        }

        logger.error('Error registering user', err, { email });
        res.status(500).json({ error: 'Failed to register user.' });
    }
};


// Login User
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {

        const user = await db('users')
            .leftJoin('roles', 'users.role_id', 'roles.id') // Use LEFT JOIN to include users with NULL role_id
            .select('users.id', 'users.email', 'users.password', 'users.role_id', 'roles.name as role_name')
            .whereRaw('LOWER(users.email) = ?', [email.toLowerCase()]) // Ensure case-insensitive matching
            .andWhere('users.is_deleted', 0) // Exclude deleted users
            .andWhere('users.is_active', 1) // Exclude inactive users
            .first();


        if (!user) {
            console.error('User not found for supplied credentials');
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (!user.password) {
            console.error('User password is missing in the database.');
            return res.status(500).json({ error: 'Server error. Please contact support.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = await generateToken(user);

        res.status(200).json({ token });
    } catch (err) {
        console.error('Error during login:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};


// Google Authentication
const googleAuth = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        // Fetch the Google Client ID dynamically
        const CLIENT_ID = await getSetting('google_client_id');

        const client = new OAuth2Client(CLIENT_ID);

        // Verify the token
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID, // Must match the client ID
        });

        const payload = ticket.getPayload();
        const { sub, email, given_name, family_name, picture } = payload;

        // Fetch the role ID for 'league_user'
        const leagueUserRole = await db('roles').select('id', 'name').where({ name: 'league_user' }).first();

        if (!leagueUserRole) {
            return res.status(500).json({ error: 'Role "league_user" not found in the database.' });
        }

        // Check if the user exists in the database
        let user = await db('users').where({ email }).first();
        if (!user) {
            // Create a new user if not found
            const [userId] = await db('users').insert({
                google_id: sub,
                email,
                firstname: given_name,
                lastname: family_name,
                picture, // Use Google picture for new users
                role_id: leagueUserRole.id, // Assign the 'league_user' role
            });
            user = {
                id: userId,
                email,
                firstname: given_name,
                lastname: family_name,
                picture,
                role_id: leagueUserRole.id,
                role_name: leagueUserRole.name, // Include role_name
            };
        } else {
            // Only update picture if it is null (user hasn't uploaded a custom picture)
            // Do NOT update firstname/lastname - respect user's manual changes
            const updates = {};

            if (!user.picture) {
                updates.picture = picture;
            }

            if (Object.keys(updates).length > 0) {
                await db('users').where({ email }).update(updates);
            }

            // Fetch the user's actual role from database (don't override)
            const userRole = await db('roles').select('name').where({ id: user.role_id }).first();
            user.role_name = userRole ? userRole.name : leagueUserRole.name;
        }

        // Generate token using the utility function
        const jwtToken = await generateToken(user);

        res.status(200).json({ success: true, token: jwtToken });
    } catch (err) {
        console.error('Error in Google Auth:', err.message);
        handleError(res, err, 401, 'Invalid Google token');
    }
};

// Verify Google Token
const verifyGoogleToken = async (req, res) => {
    const { token } = req.body;

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID,
        });

        const payload = ticket.getPayload();
        res.status(200).json({ message: 'User authenticated successfully', user: payload });
    } catch (err) {
        handleError(res, err, 401, 'Invalid token');
    }
};

module.exports = {
    registerUser,
    loginUser,
    googleAuth,
    verifyGoogleToken,
};