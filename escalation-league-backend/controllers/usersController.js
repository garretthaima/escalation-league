const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../models/db');
const { OAuth2Client } = require('google-auth-library');

// Load environment variables
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const SECRET_KEY = process.env.SECRET_KEY;
const client = new OAuth2Client(CLIENT_ID);

// Utility function for error handling
const handleError = (res, error, statusCode = 500, message = 'Internal server error') => {
  console.error(error);
  res.status(statusCode).json({ error: message });
};

// Register User
const registerUser = async (req, res) => {
  const { firstname, lastname, email, password } = req.body;

  try {
    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the user into the database
    const [userId] = await db('users').insert({
      firstname,
      lastname,
      email,
      password: hashedPassword,
    });

    // Send a success response
    console.log('Response sent:', { success: true, userId });
    res.status(201).json({ success: true, userId });
  } catch (err) {
    console.error('Error registering user:', err.message);

    // Handle duplicate email error (MySQL error code 1062)
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email is already registered.' });
    }

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
    const user = await db('users').where({ email }).first();

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      SECRET_KEY,
      { expiresIn: '1h' }
    );

    res.status(200).json({ token });
  } catch (err) {
    handleError(res, err);
  }
};

// Google Authentication
const googleAuth = async (req, res) => {
  const { token } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    let user = await db('users').where({ email }).first();

    if (!user) {
      const [userId] = await db('users').insert({
        email,
        firstname: name,
        picture,
      });

      user = { id: userId, email, firstname: name };
    }

    const jwtToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role || 'user' },
      SECRET_KEY,
      { expiresIn: '1h' }
    );

    res.status(200).json({ success: true, token: jwtToken });
  } catch (err) {
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

// Fetch User Profile
const getUserProfile = async (req, res) => {
  try {
    // Fetch user details from the database using the user ID from the token
    const user = await db('users')
      .select(
        'id',
        'firstname',
        'lastname',
        'email',
        'picture',
        'current_commander',
        'past_commanders',
        'wins',
        'losses',
        'winning_streak',
        'losing_streak',
        'opponent_win_percentage',
        'most_common_win_condition',
        'favorite_color',
        'deck_archetype',
        'last_login',
        'is_active',
        'role'
      )
      .where({ id: req.user.id, is_deleted: false })
      .first();

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Fetch current league and league-specific stats
    const currentLeague = await db('user_leagues')
      .join('leagues', 'user_leagues.league_id', 'leagues.id')
      .select(
        'leagues.name as league_name',
        'user_leagues.decklist_url',
        'user_leagues.league_wins',
        'user_leagues.league_losses'
      )
      .where('user_leagues.user_id', req.user.id)
      .first();

    // Respond with user details and current league (if any)
    res.status(200).json({
      user,
      currentLeague: currentLeague || null, // Explicitly return null if no league is found
    });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
};

// Update User Profile
const updateUserProfile = async (req, res) => {
  const userId = req.user.id; // Extract user ID from the token
  const { firstname, lastname, email, picture, favorite_color, deck_archetype } = req.body;

  try {
    // Fetch the user to check if they have a google_id
    const user = await db('users').select('google_id').where({ id: userId }).first();

    // Restrict email updates if the user has a google_id
    if (email && user.google_id) {
      return res.status(400).json({ error: 'Email updates are not allowed for Google-authenticated users.' });
    }

    // Validate input
    if (!firstname && !lastname && !email && !picture && !favorite_color && !deck_archetype) {
      return res.status(400).json({ error: 'No valid fields to update.' });
    }

    // Build the update object dynamically
    const updates = {};
    if (firstname) updates.firstname = firstname;
    if (lastname) updates.lastname = lastname;
    if (email) updates.email = email;
    if (picture) updates.picture = picture;
    if (favorite_color) updates.favorite_color = favorite_color;
    if (deck_archetype) updates.deck_archetype = deck_archetype;

    // Update the user in the database
    await db('users').where({ id: userId }).update(updates);

    // Log the activity
    await db('activity_logs').insert({
      user_id: userId,
      action: 'Profile updated',
      metadata: JSON.stringify(updates),
    });

    res.status(200).json({ message: 'Profile updated successfully.' });
  } catch (err) {
    console.error('Error updating user profile:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
};

const deleteUserAccount = async (req, res) => {
  const userId = req.user.id;

  try {
    await db('users').where({ id: userId }).update({ is_deleted: true });
    res.status(200).json({ message: 'User account soft deleted successfully.' });
  } catch (err) {
    console.error('Error soft deleting user account:', err);
    res.status(500).json({ error: 'Failed to soft delete user account.' });
  }
};

const changePassword = async (req, res) => {
  const userId = req.user.id;
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Old password and new password are required.' });
  }

  try {
    const user = await db('users').select('password', 'google_id').where({ id: userId }).first();

    // Restrict password changes for Google-authenticated users
    if (user.google_id) {
      return res.status(400).json({ error: 'Password changes are not allowed for Google-authenticated users.' });
    }

    // Verify the old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Old password is incorrect.' });
    }

    // Hash the new password and update it
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db('users').where({ id: userId }).update({ password: hashedPassword });

    res.status(200).json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ error: 'Failed to change password.' });
  }
};

const getAllUsers = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admins only.' });
  }

  try {
    const users = await db('users').select('id', 'firstname', 'lastname', 'email', 'role', 'is_active');
    res.status(200).json({ users });
  } catch (err) {
    console.error('Error fetching all users:', err);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
};

const deactivateUser = async (req, res) => {
  const { id } = req.params;

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admins only.' });
  }

  try {
    await db('users').where({ id }).update({ is_active: false });
    res.status(200).json({ message: 'User account deactivated successfully.' });
  } catch (err) {
    console.error('Error deactivating user account:', err);
    res.status(500).json({ error: 'Failed to deactivate user account.' });
  }
};

module.exports = { registerUser, loginUser, googleAuth, verifyGoogleToken, getUserProfile, updateUserProfile, deleteUserAccount, changePassword, getAllUsers };


