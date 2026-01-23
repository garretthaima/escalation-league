import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { getUserPermissions, getUserProfile, getUserSetting, updateUserSetting } from '../../api/usersApi'; // Add API calls
import { isUserInLeague } from '../../api/userLeaguesApi'; // Import the API call for activeLeague

const PermissionsContext = createContext();

export const PermissionsProvider = ({ children }) => {
    const [permissions, setPermissions] = useState([]);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [darkMode, setDarkMode] = useState(true); // Default to dark mode
    const [activeLeague, setActiveLeague] = useState(null); // Add activeLeague state
    const [refreshKey, setRefreshKey] = useState(0); // Add refresh mechanism
    const refreshResolvers = useRef([]); // Store promise resolvers for refreshUserData

    const fetchPermissionsAndUser = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            // Clear all state if no token
            setPermissions([]);
            setUser(null);
            setActiveLeague(null);
            setLoading(false);
            return { activeLeague: null };
        }

        try {
            // Fetch permissions
            const permissionsData = await getUserPermissions();
            setPermissions(permissionsData.permissions);

            // Fetch user profile
            const profileData = await getUserProfile();
            setUser(profileData.user); // Store the full user object

            // Fetch user settings (dark mode)
            const darkModeSetting = await getUserSetting('dark_mode'); // Fetch dark_mode setting
            setDarkMode(darkModeSetting.value === 'true'); // Set dark mode based on the backend value

            // Fetch active league
            const { inLeague, league } = await isUserInLeague();
            const leagueData = inLeague ? league : null;
            setActiveLeague(leagueData);

            return { activeLeague: leagueData };
        } catch (err) {
            console.error('Failed to fetch permissions, user profile, or settings:', err);
            // Clear state on error
            setPermissions([]);
            setUser(null);
            setActiveLeague(null);
            return { activeLeague: null };
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPermissionsAndUser().then((result) => {
            // Resolve any pending refreshUserData promises
            refreshResolvers.current.forEach(resolve => resolve(result));
            refreshResolvers.current = [];
        });
    }, [refreshKey, fetchPermissionsAndUser]);

    // Function to force refresh user data - returns a promise that resolves when data is loaded
    const refreshUserData = useCallback(() => {
        return new Promise((resolve) => {
            refreshResolvers.current.push(resolve);
            setRefreshKey(prev => prev + 1);
        });
    }, []);

    // Update dark mode setting in the backend
    const toggleDarkMode = async () => {
        const newDarkMode = !darkMode;
        setDarkMode(newDarkMode); // Update state immediately for responsiveness
        try {
            await updateUserSetting('dark_mode', newDarkMode.toString()); // Persist to backend
        } catch (err) {
            console.error('Failed to update dark mode setting:', err);
        }
    };

    useEffect(() => {
        // Apply dark mode class to the body
        if (darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }, [darkMode]); // Runs whenever darkMode changes

    // Listen for token refresh events and re-fetch user data
    useEffect(() => {
        const handleTokenRefresh = () => {
            console.log('[PermissionsProvider] Token refreshed, re-fetching user data');
            refreshUserData();
        };

        const handleTokenRefreshFailed = () => {
            console.log('[PermissionsProvider] Token refresh failed, clearing state');
            // Clear all state and stop loading when auth fails
            setPermissions([]);
            setUser(null);
            setActiveLeague(null);
            setLoading(false);
            // Resolve any pending refresh promises with null
            refreshResolvers.current.forEach(resolve => resolve({ activeLeague: null }));
            refreshResolvers.current = [];
        };

        window.addEventListener('tokenRefreshed', handleTokenRefresh);
        window.addEventListener('tokenRefreshFailed', handleTokenRefreshFailed);
        return () => {
            window.removeEventListener('tokenRefreshed', handleTokenRefresh);
            window.removeEventListener('tokenRefreshFailed', handleTokenRefreshFailed);
        };
    }, [refreshUserData]);

    return (
        <PermissionsContext.Provider
            value={{
                permissions,
                setPermissions,
                user,
                setUser,
                activeLeague, // Expose activeLeague
                setActiveLeague, // Expose setter for activeLeague
                loading,
                darkMode,
                toggleDarkMode, // Expose toggle function
                refreshUserData, // Expose refresh function
            }}
        >
            {children}
        </PermissionsContext.Provider>
    );
};

export const usePermissions = () => useContext(PermissionsContext);
