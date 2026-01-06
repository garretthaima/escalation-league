const bcrypt = require('bcrypt');
const db = require('../models/db');
const redis = require('../utils/redisClient');
const { updateStats } = require('../utils/statsUtils');

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
    // Validate input
    if (!firstname && !lastname && !email && !picture && !favorite_color && !deck_archetype) {
      return res.status(400).json({ error: 'No valid fields to update.' });
    }

    // Build the update object dynamically
    const updates = {};
    if (firstname) updates.firstname = firstname;
    if (lastname) updates.lastname = lastname;
    if (email) updates.email = email;
    if (favorite_color) updates.favorite_color = favorite_color;
    if (deck_archetype) updates.deck_archetype = deck_archetype;

    // Only validate and normalize picture if it's being updated
    if (picture) {
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
      updates.picture = normalizedPicture; // Save the normalized path
    }

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
  const { userId, wins, losses, draws } = req.body;

  console.log('Request body:', req.body); // Log the request body for debugging

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  if (wins === undefined && losses === undefined && draws === undefined) {
    return res.status(400).json({ error: 'At least one of wins, losses, or draws must be provided.' });
  }

  try {
    // Use the utility function to update user stats
    await updateStats('users', { id: userId }, { wins, losses, draws });

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

const getUserSetting = async (req, res) => {
  const userId = req.user.id;
  const { key_name } = req.query;

  if (!key_name) {
    return res.status(400).json({ error: 'key_name is required.' });
  }

  try {
    const setting = await db('user_settings')
      .select('value')
      .where({ user_id: userId, key_name })
      .first();

    // Return a default value if the setting does not exist
    const defaultValue = key_name === 'dark_mode' ? 'false' : null;
    const value = setting ? setting.value : defaultValue;

    res.status(200).json({ key_name, value });
  } catch (err) {
    console.error(`Error fetching setting "${key_name}":`, err.message);
    res.status(500).json({ error: `Failed to fetch setting "${key_name}".` });
  }
};

const updateUserSetting = async (req, res) => {
  const userId = req.user.id;
  const { key_name, value } = req.body;

  if (!key_name || value === undefined) {
    return res.status(400).json({ error: 'key_name and value are required.' });
  }

  try {
    const existingSetting = await db('user_settings')
      .where({ user_id: userId, key_name })
      .first();

    if (existingSetting) {
      // Update the existing setting
      await db('user_settings')
        .where({ user_id: userId, key_name })
        .update({ value: value.toString(), updated_at: db.fn.now() });
    } else {
      // Insert a new setting
      await db('user_settings').insert({
        user_id: userId,
        key_name,
        value: value.toString(),
      });
    }

    res.status(200).json({ message: `Setting "${key_name}" updated successfully.` });
  } catch (err) {
    console.error(`Error updating setting "${key_name}":`, err.message);
    res.status(500).json({ error: `Failed to update setting "${key_name}".` });
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
  getUserSummary,
  getUserSetting,
  updateUserSetting,
};
