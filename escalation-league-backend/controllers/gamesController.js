const gameService = require('../services/gameService');
const db = require('../models/db'); // Adjust the path if necessary

// Fetch Participants for a Game
const getGameParticipants = async (req, res) => {
  const { gameId } = req.params;

  try {
    const participants = await gameService.getParticipants('game', gameId);
    res.status(200).json(participants);
  } catch (err) {
    console.error('Error fetching game participants:', err.message);
    res.status(500).json({ error: 'Failed to fetch game participants.' });
  }
};

// Delete a Game
const deleteGame = async (req, res) => {
  const { gameId } = req.params;

  try {
    await gameService.deleteById('games', gameId);
    res.status(200).json({ message: 'Game deleted successfully.' });
  } catch (err) {
    console.error('Error deleting game:', err.message);
    res.status(500).json({ error: 'Failed to delete game.' });
  }
};

const getGameHistory = async (req, res) => {
  const { leagueId } = req.query; // Optional filter by league
  const userId = req.user.id; // Fetch games for the authenticated user

  try {
    const query = db('games as g')
      .join('game_players as gp', 'gp.game_id', 'g.id')
      .select(
        'g.id as game_id',
        'g.league_id',
        'g.result',
        'g.created_at',
        db.raw('GROUP_CONCAT(gp.player_id) as participants')
      )
      .groupBy('g.id')
      .orderBy('g.created_at', 'desc');

    if (leagueId) {
      query.where('g.league_id', leagueId);
    }

    const games = await query;
    res.status(200).json(games);
  } catch (err) {
    console.error('Error fetching game history:', err.message);
    res.status(500).json({ error: 'Failed to fetch game history.' });
  }
};

const confirmGame = async (req, res) => {
  const { gameId } = req.body;
  const playerId = req.user.id;

  try {
    const gameParticipant = await db('game_players')
      .where({ game_id: gameId, player_id: playerId })
      .first();

    if (!gameParticipant) {
      return res.status(404).json({ error: 'You are not part of this game.' });
    }

    if (gameParticipant.confirmed) {
      return res.status(400).json({ error: 'You have already confirmed participation in this game.' });
    }

    await db('game_players')
      .where({ game_id: gameId, player_id: playerId })
      .update({ confirmed: true });

    res.status(200).json({ message: 'Game participation confirmed successfully.' });
  } catch (err) {
    console.error('Error confirming game participation:', err.message);
    res.status(500).json({ error: 'Failed to confirm game participation.' });
  }
};

const getGameDetails = async (req, res) => {
  const { gameId } = req.params;

  try {
    const game = await db('games').where({ id: gameId }).first();

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
  const updates = req.body;

  try {
    const game = await db('games').where({ id: gameId }).first();

    if (!game) {
      return res.status(404).json({ error: 'Game not found.' });
    }

    await db('games').where({ id: gameId }).update(updates);

    res.status(200).json({ message: 'Game updated successfully.' });
  } catch (err) {
    console.error('Error updating game details:', err.message);
    res.status(500).json({ error: 'Failed to update game details.' });
  }
};

const getGamesInLeague = async (req, res) => {
  const { leagueId } = req.params;

  try {
    const games = await db('games')
      .where({ league_id: leagueId, deleted_at: null })
      .orderBy('date', 'desc');

    res.status(200).json(games);
  } catch (err) {
    console.error('Error fetching games in league:', err.message);
    res.status(500).json({ error: 'Failed to fetch games in league.' });
  }
};

module.exports = {
  getGameParticipants,
  deleteGame,
  getGameHistory,
  confirmGame,
  getGameDetails,
  updateGameDetails,
  getGamesInLeague
};