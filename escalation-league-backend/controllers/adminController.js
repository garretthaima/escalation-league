const db = require('../models/db');
const redis = require('../utils/redisClient');
const bcrypt = require('bcrypt');
const {
    logUserRoleChange,
    logUserBanned,
    logUserUnbanned,
    logUserActivated,
    logUserDeactivated,
    logPasswordReset
} = require('../services/activityLogService');
const { validatePassword } = require('../utils/passwordValidator');

// Fetch All Users (Admin Only)
const getAllUsers = async (req, res) => {

    try {
        const users = await db('users')
            .leftJoin('roles', 'users.role_id', 'roles.id')
            .select(
                'users.id',
                'users.firstname',
                'users.lastname',
                'users.email',
                'users.role_id',
                'roles.name as role',
                'users.is_active'
            )
            .whereNot('users.id', 1); // Exclude the admin break-glass account
        res.status(200).json(users);
    } catch (err) {
        console.error('Error fetching all users:', err);
        res.status(500).json({ error: 'Failed to fetch users.' });
    }
};

// Deactivate User Account (Admin Only)
const deactivateUser = async (req, res) => {
    const { id } = req.params;
    const adminId = req.user.id;

    try {
        await db('users').where({ id }).update({ is_active: false });

        // Log activity
        await logUserDeactivated(adminId, id);

        res.status(200).json({ message: 'User account deactivated successfully.' });
    } catch (err) {
        console.error('Error deactivating user account:', err);
        res.status(500).json({ error: 'Failed to deactivate user account.' });
    }
};

const activateUser = async (req, res) => {
    const { id } = req.params;
    const adminId = req.user.id;

    try {
        await db('users').where({ id }).update({ is_active: true });

        // Log activity
        await logUserActivated(adminId, id);

        res.status(200).json({ message: 'User account activated successfully.' });
    } catch (err) {
        console.error('Error activating user account:', err);
        res.status(500).json({ error: 'Failed to activate user account.' });
    }
};

const banUser = async (req, res) => {
    const { id } = req.params;
    const { ban_reason } = req.body;
    const adminId = req.user.id;

    if (!ban_reason) {
        return res.status(400).json({ error: 'Ban reason is required.' });
    }

    try {
        await db('users').where({ id }).update({ is_banned: true, ban_reason });

        // Log activity
        await logUserBanned(adminId, id);

        res.status(200).json({ message: 'User account banned successfully.' });
    } catch (err) {
        console.error('Error banning user account:', err);
        res.status(500).json({ error: 'Failed to ban user account.' });
    }
};

const unbanUser = async (req, res) => {
    const { id } = req.params;
    const adminId = req.user.id;

    try {
        await db('users').where({ id }).update({ is_banned: false, ban_reason: null });

        // Log activity
        await logUserUnbanned(adminId, id);

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
            .leftJoin('roles', 'users.role_id', 'roles.id')
            .select(
                'users.id',
                'users.firstname',
                'users.lastname',
                'users.email',
                'users.role_id',
                'roles.name as role',
                'users.is_active',
                'users.is_banned',
                'users.ban_reason',
                'users.wins',
                'users.losses',
                'users.current_commander',
                'users.past_commanders'
            )
            .where('users.id', id)
            .first();

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.status(200).json(user);
    } catch (err) {
        console.error('Error fetching user details:', err);
        res.status(500).json({ error: 'Failed to fetch user details.' });
    }
};


const resetUserPassword = async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;
    const adminId = req.user.id;

    if (!newPassword) {
        return res.status(400).json({ error: 'New password is required.' });
    }

    // Validate password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
        return res.status(400).json({
            error: 'Password does not meet requirements',
            details: passwordValidation.errors
        });
    }

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db('users').where({ id }).update({ password: hashedPassword });

        // Log activity
        await logPasswordReset(id, adminId);

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

        res.status(200).json(requests);
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

// Assign Role to User (Admin Only)
const assignUserRole = async (req, res) => {
    const { userId } = req.params;
    const { roleId } = req.body;
    const adminId = req.user.id;

    if (!roleId) {
        return res.status(400).json({ error: 'Role ID is required.' });
    }

    try {
        // Verify the user exists
        const user = await db('users').where({ id: userId }).first();
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Verify the role exists
        const role = await db('roles').where({ id: roleId }).first();
        if (!role) {
            return res.status(404).json({ error: 'Role not found.' });
        }

        // Get old role for logging
        const oldRole = await db('roles').where({ id: user.role_id }).first();

        // Update the user's role
        await db('users').where({ id: userId }).update({ role_id: roleId });

        // Invalidate the Redis cache for this user so changes take effect immediately
        const cacheKey = `user:role:${userId}`;
        await redis.del(cacheKey);

        // Log activity
        await logUserRoleChange(adminId, userId, oldRole?.name || 'unknown', role.name);

        res.status(200).json({
            success: true,
            message: `User role updated to ${role.name} successfully.`,
            user: {
                id: user.id,
                email: user.email,
                role_id: roleId,
                role_name: role.name
            }
        });
    } catch (err) {
        console.error('Error assigning user role:', err.message);
        res.status(500).json({ error: 'Failed to assign user role.' });
    }
};

// Get All Roles (for dropdown in frontend)
const getAllRoles = async (req, res) => {
    try {
        const roles = await db('roles')
            .select('id', 'name', 'description')
            .orderBy('id');

        res.status(200).json({ roles });
    } catch (err) {
        console.error('Error fetching roles:', err.message);
        res.status(500).json({ error: 'Failed to fetch roles.' });
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
    reviewRoleRequest,
    assignUserRole,
    getAllRoles
};