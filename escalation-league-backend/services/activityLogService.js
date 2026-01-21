/**
 * Activity Log Service
 * Centralized service for logging user actions throughout the application
 */

const db = require('../models/db');

/**
 * Core logging function
 * @param {number} userId - User performing the action
 * @param {string} action - Action description
 * @param {object|null} metadata - Additional data about the action
 */
const logActivity = async (userId, action, metadata = null) => {
    try {
        await db('activity_logs').insert({
            user_id: userId,
            action,
            metadata: metadata ? JSON.stringify(metadata) : null
        });
    } catch (err) {
        // Log error but don't throw - activity logging should not break main functionality
        console.error('Failed to log activity:', err.message);
    }
};

// ============================================================================
// Authentication Actions
// ============================================================================

const logLogin = async (userId, ip = null) => {
    return logActivity(userId, 'User logged in', { ip });
};

const logLogout = async (userId) => {
    return logActivity(userId, 'User logged out');
};

const logPasswordChange = async (userId) => {
    return logActivity(userId, 'Password changed');
};

const logPasswordReset = async (userId, adminId = null) => {
    if (adminId) {
        return logActivity(adminId, 'Admin reset user password', { targetUserId: userId });
    }
    return logActivity(userId, 'Password reset');
};

// ============================================================================
// Profile Actions
// ============================================================================

const logProfileUpdate = async (userId, updatedFields) => {
    return logActivity(userId, 'Profile updated', { fields: Object.keys(updatedFields) });
};

const logAccountDeletion = async (userId) => {
    return logActivity(userId, 'Account deleted');
};

// ============================================================================
// League Actions
// ============================================================================

const logLeagueSignup = async (userId, leagueId, leagueName) => {
    return logActivity(userId, 'League signup requested', { leagueId, leagueName });
};

const logLeagueSignupApproved = async (adminId, userId, leagueId, leagueName) => {
    return logActivity(adminId, 'Approved league signup', { targetUserId: userId, leagueId, leagueName });
};

const logLeagueSignupRejected = async (adminId, userId, leagueId, leagueName) => {
    return logActivity(adminId, 'Rejected league signup', { targetUserId: userId, leagueId, leagueName });
};

const logLeagueLeft = async (userId, leagueId) => {
    return logActivity(userId, 'Left league', { leagueId });
};

// ============================================================================
// Game/Pod Actions
// ============================================================================

const logPodCreated = async (userId, podId, leagueId) => {
    return logActivity(userId, 'Game created', { podId, leagueId });
};

const logPodJoined = async (userId, podId) => {
    return logActivity(userId, 'Joined game', { podId });
};

const logGameResultDeclared = async (userId, podId, winnerId) => {
    return logActivity(userId, 'Declared game result', { podId, winnerId });
};

const logGameResultConfirmed = async (userId, podId) => {
    return logActivity(userId, 'Confirmed game result', { podId });
};

const logGameCompleted = async (userId, podId) => {
    return logActivity(userId, 'Game completed', { podId });
};

// ============================================================================
// Admin Actions
// ============================================================================

const logUserRoleChange = async (adminId, targetUserId, oldRole, newRole) => {
    return logActivity(adminId, 'Changed user role', { targetUserId, oldRole, newRole });
};

const logUserBanned = async (adminId, targetUserId) => {
    return logActivity(adminId, 'Banned user', { targetUserId });
};

const logUserUnbanned = async (adminId, targetUserId) => {
    return logActivity(adminId, 'Unbanned user', { targetUserId });
};

const logUserActivated = async (adminId, targetUserId) => {
    return logActivity(adminId, 'Activated user', { targetUserId });
};

const logUserDeactivated = async (adminId, targetUserId) => {
    return logActivity(adminId, 'Deactivated user', { targetUserId });
};

const logPodUpdated = async (adminId, podId, changes) => {
    return logActivity(adminId, 'Updated pod', { podId, changes });
};

const logPodDeleted = async (adminId, podId) => {
    return logActivity(adminId, 'Deleted pod', { podId });
};

module.exports = {
    logActivity,
    // Auth
    logLogin,
    logLogout,
    logPasswordChange,
    logPasswordReset,
    // Profile
    logProfileUpdate,
    logAccountDeletion,
    // League
    logLeagueSignup,
    logLeagueSignupApproved,
    logLeagueSignupRejected,
    logLeagueLeft,
    // Game/Pod
    logPodCreated,
    logPodJoined,
    logGameResultDeclared,
    logGameResultConfirmed,
    logGameCompleted,
    // Admin
    logUserRoleChange,
    logUserBanned,
    logUserUnbanned,
    logUserActivated,
    logUserDeactivated,
    logPodUpdated,
    logPodDeleted
};
