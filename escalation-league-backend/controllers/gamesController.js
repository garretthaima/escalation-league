const db = require('../models/db');

// Log a Game
const { createGame } = require('../models/gameModel');
const { WIN_CONDITIONS } = require('../utils/constants');

const logGame = async (req, res) => {
  const { opponents, result, date, winCondition, league_id } = req.body;
  const creatorId = req.user.id;

  if (!winCondition || !WIN_CONDITIONS.includes(winCondition)) {
    return res.status(400).json({ error: 'Invalid or missing win condition.' });
  }

  if (!opponents || !Array.isArray(opponents) || opponents.length < 1 || opponents.length > 3) {
    return res.status(400).json({ error: 'You must provide between 1 and 3 opponents.' });
  }

  if (!result || !date || !league_id) {
    return res.status(400).json({ error: 'Result, date, and league_id are required.' });
  }

  try {
    // Validate league
    const league = await db('leagues').where({ id: league_id }).first();
    if (!league) {
      return res.status(404).json({ error: 'League not found.' });
    }

    // Validate opponents
    const opponentRows = await db('users').whereIn('username', opponents).select('id', 'username');
    if (opponentRows.length !== opponents.length) {
      const foundUsernames = opponentRows.map(row => row.username);
      const missingUsernames = opponents.filter(username => !foundUsernames.includes(username));
      return res.status(404).json({ error: `Opponent(s) not found: ${missingUsernames.join(', ')}` });
    }

    const opponentIds = opponentRows.map(row => row.id);

    // Insert game
    const [gameId] = await db('games').insert({
      creator_id: creatorId,
      result,
      date,
      win_condition: winCondition,
      league_id,
    });

    // Insert game players
    const gamePlayers = opponentIds.map(playerId => ({
      game_id: gameId,
      player_id: playerId,
    }));
    gamePlayers.push({ game_id: gameId, player_id: creatorId }); // Add creator as a player
    await db('game_players').insert(gamePlayers);

    res.status(201).json({ message: 'Game logged successfully.', gameId });
  } catch (err) {
    console.error('Error logging game:', err.message);
    res.status(500).json({ error: 'Failed to log game.' });
  }
};

const confirmGame = async (req, res) => {
  const { gameId } = req.body;
  const playerId = req.user.id;

  if (!gameId) {
    return res.status(400).json({ error: 'Game ID is required.' });
  }

  try {
    const gamePlayer = await db('game_players')
      .where({ game_id: gameId, player_id: playerId })
      .first();

    if (!gamePlayer) {
      return res.status(404).json({ error: 'You are not part of this game.' });
    }

    if (gamePlayer.confirmed) {
      return res.status(400).json({ error: 'You have already confirmed this game.' });
    }

    await db('game_players')
      .where({ game_id: gameId, player_id: playerId })
      .update({ confirmed: 1 });

    res.status(200).json({ message: 'Game confirmed successfully.' });
  } catch (err) {
    console.error('Error confirming game:', err.message);
    res.status(500).json({ error: 'Failed to confirm game.' });
  }
};

const getGameHistory = async (req, res) => {
  const userId = req.user.id;

  try {
    const games = await db('games as g')
      .leftJoin('game_players as gp', 'g.id', 'gp.game_id')
      .leftJoin('users as u', 'gp.player_id', 'u.id')
      .select(
        'g.id as game_id',
        'g.result',
        'g.date',
        'g.win_condition',
        'g.league_id',
        db.raw('GROUP_CONCAT(u.username) as players'),
        db.raw('GROUP_CONCAT(u.id) as player_ids'),
        db.raw('SUM(gp.confirmed) as confirmations')
      )
      .where('g.creator_id', userId)
      .orWhere('gp.player_id', userId)
      .groupBy('g.id')
      .orderBy('g.date', 'desc');

    res.status(200).json(games);
  } catch (err) {
    console.error('Error fetching game history:', err.message);
    res.status(500).json({ error: 'Failed to fetch game history.' });
  }
};

const getGameDetails = async (req, res) => {
  const { gameId } = req.params;

  try {
    const game = await db('games as g')
      .leftJoin('game_players as gp', 'g.id', 'gp.game_id')
      .leftJoin('users as u', 'gp.player_id', 'u.id')
      .select(
        'g.id as game_id',
        'g.result',
        'g.date',
        'g.win_condition',
        'g.league_id',
        db.raw('GROUP_CONCAT(u.username) as players'),
        db.raw('GROUP_CONCAT(u.id) as player_ids'),
        db.raw('GROUP_CONCAT(gp.confirmed) as confirmations')
      )
      .where('g.id', gameId)
      .groupBy('g.id')
      .first();

    if (!game) {
      return res.status(404).json({ error: 'Game not found.' });
    }

    res.status(200).json(game);
  } catch (err) {
    console.error('Error fetching game details:', err.message);
    res.status(500).json({ error: 'Failed to fetch game details.' });
  }
};

const updateGameDetails = async (req, res) => {
  const { gameId } = req.params;
  const { result, winCondition, date } = req.body;
  const userId = req.user.id;

  try {
    // Check if the user is the creator or a league admin
    const game = await db('games').where({ id: gameId }).first();
    if (!game) {
      return res.status(404).json({ error: 'Game not found.' });
    }

    if (game.creator_id !== userId && req.user.role !== 'league_admin') {
      return res.status(403).json({ error: 'Access denied. You are not authorized to update this game.' });
    }

    const updates = {};
    if (result) updates.result = result;
    if (winCondition) updates.win_condition = winCondition;
    if (date) updates.date = date;

    await db('games').where({ id: gameId }).update(updates);

    res.status(200).json({ message: 'Game updated successfully.' });
  } catch (err) {
    console.error('Error updating game details:', err.message);
    res.status(500).json({ error: 'Failed to update game details.' });
  }
};

const deleteGame = async (req, res) => {
  const { gameId } = req.params;

  try {
    await db('games').where({ id: gameId }).update({ deleted_at: new Date() });
    res.status(200).json({ message: 'Game soft deleted successfully.' });
  } catch (err) {
    console.error('Error soft deleting game:', err.message);
    res.status(500).json({ error: 'Failed to delete game.' });
  }
};

const getGamesInLeague = async (req, res) => {
  const { leagueId } = req.params;

  try {
    const games = await db('games as g')
      .leftJoin('game_players as gp', 'g.id', 'gp.game_id')
      .leftJoin('users as u', 'gp.player_id', 'u.id')
      .select(
        'g.id as game_id',
        'g.result',
        'g.date',
        'g.win_condition',
        db.raw('GROUP_CONCAT(u.username) as players'),
        db.raw('GROUP_CONCAT(u.id) as player_ids'),
        db.raw('SUM(gp.confirmed) as confirmations')
      )
      .where('g.league_id', leagueId)
      .groupBy('g.id')
      .orderBy('g.date', 'desc');

    if (games.length === 0) {
      return res.status(404).json({ error: 'No games found for this league.' });
    }

    res.status(200).json(games);
  } catch (err) {
    console.error('Error fetching games in league:', err.message);
    res.status(500).json({ error: 'Failed to fetch games in league.' });
  }
};

module.exports = {
  logGame,
  confirmGame,
  getGameHistory,
  getGameDetails,
  updateGameDetails,
  deleteGame,
  getGamesInLeague,
};