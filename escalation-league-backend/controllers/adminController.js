const db = require('../models/db');

// Fetch All Users (Admin Only)
const getAllUsers = async (req, res) => {

    try {
        const users = await db('users').select('id', 'firstname', 'lastname', 'email', 'role', 'is_active');
        res.status(200).json({ users });
    } catch (err) {
        console.error('Error fetching all users:', err);
        res.status(500).json({ error: 'Failed to fetch users.' });
    }
};

// Deactivate User Account (Admin Only)
const deactivateUser = async (req, res) => {
    const { id } = req.params;

    try {
        await db('users').where({ id }).update({ is_active: false });
        res.status(200).json({ message: 'User account deactivated successfully.' });
    } catch (err) {
        console.error('Error deactivating user account:', err);
        res.status(500).json({ error: 'Failed to deactivate user account.' });
    }
};

const activateUser = async (req, res) => {
    const { id } = req.params;

    try {
        await db('users').where({ id }).update({ is_active: true });
        res.status(200).json({ message: 'User account activated successfully.' });
    } catch (err) {
        console.error('Error activating user account:', err);
        res.status(500).json({ error: 'Failed to activate user account.' });
    }
};

const banUser = async (req, res) => {
    const { id } = req.params;
    const { ban_reason } = req.body;

    if (!ban_reason) {
        return res.status(400).json({ error: 'Ban reason is required.' });
    }

    try {
        await db('users').where({ id }).update({ is_banned: true, ban_reason });
        res.status(200).json({ message: 'User account banned successfully.' });
    } catch (err) {
        console.error('Error banning user account:', err);
        res.status(500).json({ error: 'Failed to ban user account.' });
    }
};

const unbanUser = async (req, res) => {
    const { id } = req.params;

    try {
        await db('users').where({ id }).update({ is_banned: false, ban_reason: null });
        res.status(200).json({ message: 'User account unbanned successfully.' });
    } catch (err) {
        console.error('Error unbanning user account:', err);
        res.status(500).json({ error: 'Failed to unban user account.' });
    }
};

const getUserDetails = async (req, res) => {
    const { id } = req.params;

    try {
        const user = await db('users')
            .select(
                'id',
                'firstname',
                'lastname',
                'email',
                'role',
                'is_active',
                'is_banned',
                'ban_reason',
                'wins',
                'losses',
                'current_commander',
                'past_commanders',
                'created_at',
                'updated_at'
            )
            .where({ id })
            .first();

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.status(200).json({ user });
    } catch (err) {
        console.error('Error fetching user details:', err);
        res.status(500).json({ error: 'Failed to fetch user details.' });
    }
};


const resetUserPassword = async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
        return res.status(400).json({ error: 'New password is required.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db('users').where({ id }).update({ password: hashedPassword });

        res.status(200).json({ message: 'User password reset successfully.' });
    } catch (err) {
        console.error('Error resetting user password:', err);
        res.status(500).json({ error: 'Failed to reset user password.' });
    }
};

const getUserActivityLogs = async (req, res) => {
    const { id } = req.params;

    try {
        const logs = await db('activity_logs')
            .where({ user_id: id })
            .select('id', 'action', 'timestamp', 'metadata')
            .orderBy('timestamp', 'desc');

        res.status(200).json({ logs });
    } catch (err) {
        console.error('Error fetching activity logs:', err);
        res.status(500).json({ error: 'Failed to fetch activity logs.' });
    }
};

const getLeagueReport = async (req, res) => {
    try {
        const leagues = await db('leagues')
            .select('id', 'name', 'start_date', 'end_date', 'is_active', 'max_players');

        res.status(200).json(leagues);
    } catch (err) {
        console.error('Error generating league report:', err.message);
        res.status(500).json({ error: 'Failed to generate league report.' });
    }
};

const getPendingRoleRequests = async (req, res) => {
    try {
        const requests = await db('role_requests')
            .join('users', 'role_requests.user_id', 'users.id')
            .join('roles', 'role_requests.requested_role_id', 'roles.id')
            .select(
                'role_requests.id',
                'users.firstname',
                'users.lastname',
                'users.email',
                'roles.name as requested_role',
                'role_requests.status',
                'role_requests.created_at'
            )
            .where('role_requests.status', 'pending');

        res.status(200).json({ requests });
    } catch (err) {
        console.error('Error fetching role requests:', err.message);
        res.status(500).json({ error: 'Failed to fetch role requests.' });
    }
};

const reviewRoleRequest = async (req, res) => {
    const { requestId, status, adminComment } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be "approved" or "rejected".' });
    }

    try {
        // Fetch the role request
        const roleRequest = await db('role_requests').where({ id: requestId }).first();
        if (!roleRequest) {
            return res.status(404).json({ error: 'Role request not found.' });
        }

        // Update the role request status
        await db('role_requests')
            .where({ id: requestId })
            .update({
                status,
                admin_comment: adminComment,
                updated_at: db.fn.now(),
            });

        // If approved, update the user's role
        if (status === 'approved') {
            await db('users').where({ id: roleRequest.user_id }).update({ role_id: roleRequest.requested_role_id });
        }

        res.status(200).json({ success: true, message: `Role request ${status} successfully.` });
    } catch (err) {
        console.error('Error reviewing role request:', err.message);
        res.status(500).json({ error: 'Failed to review role request.' });
    }
};


module.exports = {
    getAllUsers,
    deactivateUser,
    activateUser,
    banUser, unbanUser,
    getUserDetails,
    resetUserPassword,
    getUserActivityLogs,
    getLeagueReport,
    getPendingRoleRequests,
    reviewRoleRequest
};