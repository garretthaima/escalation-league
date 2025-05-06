const bcrypt = require('bcrypt');
const db = require('../models/db');
const redis = require('../utils/redisClient');

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
        'role_id'
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
        'user_leagues.deck_id',
        'user_leagues.league_wins',
        'user_leagues.league_losses'
      )
      .where('user_leagues.user_id', req.user.id)
      .first();

    // Fetch the decklist_url from Redis using the deck_id
    let decklistUrl = null;
    if (currentLeague && currentLeague.deck_id) {
      const cachedDeck = await redis.get(`deck:${currentLeague.deck_id}`);
      if (cachedDeck) {
        const deckData = JSON.parse(cachedDeck);
        decklistUrl = deckData.decklistUrl || null; // Extract decklistUrl from the cached data
      }
    }

    // Respond with user details, current league, and decklist URL
    res.status(200).json({
      user,
      currentLeague: currentLeague
        ? { ...currentLeague, decklistUrl } // Include the decklistUrl in the currentLeague object
        : null,
    });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
};

// Update User Profile
const updateUserProfile = async (req, res) => {
  const userId = req.user.id;
  const { firstname, lastname, email, picture, favorite_color, deck_archetype } = req.body;

  try {
    // Validate the picture field
    const stockImages = [
      '/images/profile-pictures/avatar1.png',
      '/images/profile-pictures/avatar2.png',
      '/images/profile-pictures/avatar3.png',
    ];

    // Normalize the picture field to handle full URLs
    const normalizedPicture = picture.replace(process.env.BACKEND_URL || 'http://localhost:3000', '');
    if (!stockImages.includes(normalizedPicture)) {
      return res.status(400).json({ error: 'Invalid profile picture selected.' });
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
    if (picture) updates.picture = normalizedPicture; // Save the normalized path
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

const updateUserStats = async (req, res) => {
  const { userId, result } = req.body;

  if (!userId || !result) {
    return res.status(400).json({ error: 'User ID and result are required.' });
  }

  try {
    const updates = {};
    if (result === 'win') {
      updates.wins = db.raw('wins + 1');
    } else if (result === 'loss') {
      updates.losses = db.raw('losses + 1');
    } else {
      return res.status(400).json({ error: 'Invalid result value.' });
    }

    await db('users').where({ id: userId }).update(updates);

    res.status(200).json({ message: 'User stats updated successfully.' });
  } catch (err) {
    console.error('Error updating user stats:', err.message);
    res.status(500).json({ error: 'Failed to update user stats.' });
  }
};

const requestRole = async (req, res) => {
  const { requestedRoleId } = req.body;
  const userId = req.user.id;

  try {
    // Check if a pending request already exists
    const existingRequest = await db('role_requests')
      .where({ user_id: userId, requested_role_id: requestedRoleId, status: 'pending' })
      .first();

    if (existingRequest) {
      return res.status(400).json({ error: 'A pending request already exists.' });
    }

    // Create a new role request
    await db('role_requests').insert({
      user_id: userId,
      requested_role_id: requestedRoleId,
    });

    res.status(200).json({ success: true, message: 'Role upgrade request submitted successfully.' });
  } catch (err) {
    console.error('Error submitting role request:', err.message);
    res.status(500).json({ error: 'Failed to submit role request.' });
  }
};

const { resolveRolesAndPermissions } = require('../utils/permissionsUtils');

const getUserPermissions = async (req, res) => {
  const { role_id } = req.user; // Assume `req.user` is populated by middleware

  try {
    const { accessibleRoles, permissions } = await resolveRolesAndPermissions(role_id);

    res.status(200).json({
      accessibleRoles,
      permissions, // Return deduplicated permissions
    });
  } catch (err) {
    console.error('Error fetching user permissions:', err);
    res.status(500).json({ error: 'Failed to fetch user permissions.' });
  }
};

// Fetch basic user information
const getUserSummary = async (req, res) => {
  const { id } = req.params;

  try {
    // Query the database for the specified columns
    const user = await db('users')
      .select(
        'id',
        'wins',
        'losses',
        'firstname',
        'lastname',
        'winning_streak',
        'losing_streak',
        'current_commander',
        'past_commanders',
        'opponent_win_percentage',
        'most_common_win_condition',
        'favorite_color',
        'deck_archetype'
      )
      .where({ id })
      .first();

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.status(200).json(user);
  } catch (err) {
    console.error('Error fetching user basic info:', err.message);
    res.status(500).json({ error: 'Failed to fetch user basic info.' });
  }
};


module.exports = {
  getUserProfile,
  updateUserProfile,
  deleteUserAccount,
  changePassword,
  getAllUsers,
  updateUserStats,
  requestRole,
  getUserPermissions,
  getUserSummary
};
