-- Fix league_view_active permission for production
-- Run with: docker exec -i escalation-league-backend-prod mysql -u league_user -p escalation_league < scripts/fix-league-view-active.sql

-- Check if permission exists, create if not
INSERT IGNORE INTO permissions (name, description)
VALUES ('league_view_active', 'Allow users to view the currently active league');

-- Get the permission ID
SET @perm_id = (SELECT id FROM permissions WHERE name = 'league_view_active');

-- Get role IDs
SET @league_user_role_id = (SELECT id FROM roles WHERE name = 'league_user');
SET @user_role_id = (SELECT id FROM roles WHERE name = 'user');

-- Add permission to league_user role if not exists
INSERT IGNORE INTO role_permissions (role_id, permission_id)
VALUES (@league_user_role_id, @perm_id);

-- Add permission to user role if not exists
INSERT IGNORE INTO role_permissions (role_id, permission_id)
VALUES (@user_role_id, @perm_id);

-- Show results
SELECT 'Permissions for league_user role:' as status;
SELECT p.name 
FROM role_permissions rp
JOIN permissions p ON rp.permission_id = p.id
WHERE rp.role_id = @league_user_role_id
ORDER BY p.name;

SELECT 'Permissions for user role:' as status;
SELECT p.name 
FROM role_permissions rp
JOIN permissions p ON rp.permission_id = p.id
WHERE rp.role_id = @user_role_id
ORDER BY p.name;
