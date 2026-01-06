const db = require('../models/db');

// Get all awards
const getAwards = async (req, res) => {
    try {
        const awards = await db('awards').select('*').orderBy('id', 'asc');
        res.status(200).json(awards);
    } catch (err) {
        console.error('Error fetching awards:', err.message);
        res.status(500).json({ error: 'Failed to fetch awards.' });
    }
};

// Get single award
const getAward = async (req, res) => {
    const { awardId } = req.params;

    try {
        const award = await db('awards').where({ id: awardId }).first();

        if (!award) {
            return res.status(404).json({ error: 'Award not found.' });
        }

        res.status(200).json(award);
    } catch (err) {
        console.error('Error fetching award:', err.message);
        res.status(500).json({ error: 'Failed to fetch award.' });
    }
};

// Create new award
const createAward = async (req, res) => {
    const { name, description } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Award name is required.' });
    }

    try {
        // Check if award with same name already exists
        const existing = await db('awards').where({ name }).first();
        if (existing) {
            return res.status(409).json({ error: 'Award with this name already exists.' });
        }

        const [awardId] = await db('awards').insert({
            name,
            description: description || null
        });

        const newAward = await db('awards').where({ id: awardId }).first();
        res.status(201).json(newAward);
    } catch (err) {
        console.error('Error creating award:', err.message);
        res.status(500).json({ error: 'Failed to create award.' });
    }
};

// Update award
const updateAward = async (req, res) => {
    const { awardId } = req.params;
    const { name, description } = req.body;

    try {
        const award = await db('awards').where({ id: awardId }).first();

        if (!award) {
            return res.status(404).json({ error: 'Award not found.' });
        }

        // Check if name is being changed to one that already exists
        if (name && name !== award.name) {
            const existing = await db('awards').where({ name }).first();
            if (existing) {
                return res.status(409).json({ error: 'Award with this name already exists.' });
            }
        }

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No fields to update.' });
        }

        await db('awards').where({ id: awardId }).update(updates);

        const updatedAward = await db('awards').where({ id: awardId }).first();
        res.status(200).json(updatedAward);
    } catch (err) {
        console.error('Error updating award:', err.message);
        res.status(500).json({ error: 'Failed to update award.' });
    }
};

// Delete award
const deleteAward = async (req, res) => {
    const { awardId } = req.params;

    try {
        const award = await db('awards').where({ id: awardId }).first();

        if (!award) {
            return res.status(404).json({ error: 'Award not found.' });
        }

        // Check if award has been given to any users
        const userAwards = await db('user_awards').where({ award_id: awardId }).first();
        if (userAwards) {
            return res.status(409).json({
                error: 'Cannot delete award that has been given to users. Consider archiving instead.'
            });
        }

        await db('awards').where({ id: awardId }).del();
        res.status(200).json({ message: 'Award deleted successfully.' });
    } catch (err) {
        console.error('Error deleting award:', err.message);
        res.status(500).json({ error: 'Failed to delete award.' });
    }
};

// Get awards for a specific league (with recipients)
const getLeagueAwards = async (req, res) => {
    const { leagueId } = req.params;

    try {
        const awards = await db('user_awards as ua')
            .join('awards as a', 'ua.award_id', 'a.id')
            .join('users as u', 'ua.user_id', 'u.id')
            .select(
                'a.id as award_id',
                'a.name as award_name',
                'a.description as award_description',
                'u.id as user_id',
                'u.firstname',
                'u.lastname',
                'ua.awarded_at'
            )
            .where({ 'ua.league_id': leagueId })
            .orderBy('ua.awarded_at', 'desc');

        res.status(200).json(awards);
    } catch (err) {
        console.error('Error fetching league awards:', err.message);
        res.status(500).json({ error: 'Failed to fetch league awards.' });
    }
};

// Give award to user
const giveAward = async (req, res) => {
    const { userId, awardId, leagueId } = req.body;

    if (!userId || !awardId || !leagueId) {
        return res.status(400).json({ error: 'User ID, Award ID, and League ID are required.' });
    }

    try {
        // Validate award exists
        const award = await db('awards').where({ id: awardId }).first();
        if (!award) {
            return res.status(404).json({ error: 'Award not found.' });
        }

        // Validate user exists
        const user = await db('users').where({ id: userId }).first();
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Validate league exists
        const league = await db('leagues').where({ id: leagueId }).first();
        if (!league) {
            return res.status(404).json({ error: 'League not found.' });
        }

        // Check if user already has this award for this league
        const existing = await db('user_awards')
            .where({ user_id: userId, award_id: awardId, league_id: leagueId })
            .first();

        if (existing) {
            return res.status(409).json({ error: 'User already has this award for this league.' });
        }

        const [userAwardId] = await db('user_awards').insert({
            user_id: userId,
            award_id: awardId,
            league_id: leagueId
        });

        const newUserAward = await db('user_awards as ua')
            .join('awards as a', 'ua.award_id', 'a.id')
            .join('users as u', 'ua.user_id', 'u.id')
            .select(
                'ua.id',
                'a.name as award_name',
                'u.firstname',
                'u.lastname',
                'ua.awarded_at'
            )
            .where({ 'ua.id': userAwardId })
            .first();

        res.status(201).json(newUserAward);
    } catch (err) {
        console.error('Error giving award:', err.message);
        res.status(500).json({ error: 'Failed to give award.' });
    }
};

// Remove award from user
const removeAward = async (req, res) => {
    const { userAwardId } = req.params;

    try {
        const userAward = await db('user_awards').where({ id: userAwardId }).first();

        if (!userAward) {
            return res.status(404).json({ error: 'User award not found.' });
        }

        await db('user_awards').where({ id: userAwardId }).del();
        res.status(200).json({ message: 'Award removed from user successfully.' });
    } catch (err) {
        console.error('Error removing award:', err.message);
        res.status(500).json({ error: 'Failed to remove award.' });
    }
};

module.exports = {
    getAwards,
    getAward,
    createAward,
    updateAward,
    deleteAward,
    getLeagueAwards,
    giveAward,
    removeAward
};
