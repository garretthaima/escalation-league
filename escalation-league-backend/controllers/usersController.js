const bcrypt = require('bcrypt');
const db = require('../models/db');
const redis = require('../utils/redisClient');
const { updateStats } = require('../utils/statsUtils');
const logger = require('../utils/logger');
const { logProfileUpdate, logAccountDeletion, logPasswordChange } = require('../services/activityLogService');
const { validatePassword } = require('../utils/passwordValidator');

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
        'draws',
        'elo_rating',
        'winning_streak',
        'losing_streak',
        'opponent_win_percentage',
        'most_common_win_condition',
        'favorite_color',
        'deck_archetype',
        'last_login',
        'is_active',
        'role_id',
        'discord_id'
      )
      .where({ id: req.user.id, is_deleted: false })
      .first();

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Calculate global ELO rank (only if user has played games)
    let eloRank = null;
    if (user.elo_rating && user.elo_rating !== 1500) {
      const rankResult = await db('users')
        .where('is_deleted', false)
        .where('elo_rating', '>', user.elo_rating)
        .count('* as higher_count')
        .first();
      eloRank = (rankResult?.higher_count || 0) + 1;
    }

    // Fetch current league and league-specific stats
    const currentLeague = await db('user_leagues')
      .join('leagues', 'user_leagues.league_id', 'leagues.id')
      .select(
        'leagues.id as league_id',
        'leagues.name',
        'leagues.start_date',
        'leagues.end_date',
        'leagues.is_active',
        'user_leagues.deck_id',
        'user_leagues.league_wins',
        'user_leagues.league_losses',
        'user_leagues.league_draws',
        'user_leagues.total_points',
        'user_leagues.rank',
        'user_leagues.elo_rating',
        'user_leagues.current_commander',
        'user_leagues.commander_partner'
      )
      .where('user_leagues.user_id', req.user.id)
      .where('user_leagues.is_active', 1)
      .first();

    // Fetch deck data (decklist_url and commander info) from Redis or database
    let decklistUrl = null;
    let commanderData = null;
    let partnerData = null;

    if (currentLeague && currentLeague.deck_id) {
      // Try Redis cache first
      const cachedDeck = await redis.get(`deck:${currentLeague.deck_id}`);
      if (cachedDeck) {
        const deckData = JSON.parse(cachedDeck);
        decklistUrl = deckData.decklist_url || deckData.decklistUrl || null;
        // Get full commander data from cached deck data
        if (deckData.commanders && Array.isArray(deckData.commanders)) {
          commanderData = deckData.commanders[0] || null;
          partnerData = deckData.commanders[1] || null;
        }
      } else {
        // Fallback: fetch from decks table directly
        const deck = await db('decks')
          .select('decklist_url', 'commanders')
          .where('id', currentLeague.deck_id)
          .first();

        if (deck) {
          decklistUrl = deck.decklist_url || null;
          const commanders = typeof deck.commanders === 'string'
            ? JSON.parse(deck.commanders)
            : deck.commanders;
          if (commanders && Array.isArray(commanders)) {
            commanderData = commanders[0] || null;
            partnerData = commanders[1] || null;
          }
        }
      }
    }

    // Respond with user details, current league, and deck data
    res.status(200).json({
      user: {
        ...user,
        elo_rank: eloRank,
      },
      currentLeague: currentLeague
        ? {
            ...currentLeague,
            decklistUrl,
            commander_name: commanderData?.name || null,
            commander_scryfall_id: commanderData?.scryfall_id || null,
            partner_name: partnerData?.name || null,
            partner_scryfall_id: partnerData?.scryfall_id || null,
          }
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
        '/images/profile-pictures/avatar4.png',
        '/images/profile-pictures/avatar5.png',
      ];

      // Normalize the picture field to handle full URLs
      const normalizedPicture = picture.replace(process.env.BACKEND_URL || 'http://localhost:3000', '');
      if (!stockImages.includes(normalizedPicture) && !normalizedPicture.startsWith('http')) {
        return res.status(400).json({ error: 'Invalid profile picture selected.' });
      }
      updates.picture = normalizedPicture; // Save the normalized path
    }

    // Check if email is being updated and if it already exists
    if (updates.email) {
      const existingUser = await db('users')
        .where({ email: updates.email })
        .whereNot({ id: userId })
        .first();
      if (existingUser) {
        return res.status(400).json({ error: 'Email is already in use.' });
      }
    }

    // Update the user in the database
    await db('users').where({ id: userId }).update(updates);

    // Log the activity
    await logProfileUpdate(userId, updates);

    res.status(200).json({ message: 'Profile updated successfully.' });
  } catch (err) {
    console.error('Error updating user profile:', err);
    // Handle duplicate email constraint error
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email is already in use.' });
    }
    res.status(500).json({ error: 'Failed to update profile.' });
  }
};

const deleteUserAccount = async (req, res) => {
  const userId = req.user.id;

  try {
    // Log the activity before deletion
    await logAccountDeletion(userId);

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

    // Validate new password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Invalid password',
        details: passwordValidation.errors
      });
    }

    // Hash the new password and update it
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db('users').where({ id: userId }).update({ password: hashedPassword });

    // Log the activity
    await logPasswordChange(userId);

    res.status(200).json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ error: 'Failed to change password.' });
  }
};

const updateUserStats = async (req, res) => {
  const { userId, wins, losses, draws } = req.body;

  logger.debug('updateUserStats called', { userId, wins, losses, draws });

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

/**
 * Get global leaderboard - all players ranked by global ELO
 * Only includes players who have played at least one game (ELO != 1500)
 */
const getGlobalLeaderboard = async (req, res) => {
  try {
    const leaderboard = await db('users')
      .select(
        'id as player_id',
        'firstname',
        'lastname',
        'elo_rating',
        'wins',
        'losses',
        'draws',
        db.raw('wins + losses + draws AS total_games'),
        db.raw(`
          ROUND(
            (wins / NULLIF(wins + losses + draws, 0)) * 100, 2
          ) AS win_rate
        `)
      )
      .where('is_deleted', false)
      .where(function() {
        // Include users who have played at least one game
        this.where('wins', '>', 0)
          .orWhere('losses', '>', 0)
          .orWhere('draws', '>', 0);
      })
      .orderBy('elo_rating', 'desc')
      .orderBy('wins', 'desc')
      .orderBy('total_games', 'desc');

    // Add rank to each player
    leaderboard.forEach((player, index) => {
      player.rank = index + 1;
    });

    res.status(200).json({ leaderboard });
  } catch (err) {
    console.error('Error fetching global leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch global leaderboard.' });
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
  updateUserStats,
  getUserPermissions,
  getUserSummary,
  getUserSetting,
  updateUserSetting,
  getGlobalLeaderboard,
};
