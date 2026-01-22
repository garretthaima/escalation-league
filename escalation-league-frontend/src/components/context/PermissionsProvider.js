import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { getUserPermissions, getUserProfile, getUserSetting, updateUserSetting } from '../../api/usersApi'; // Add API calls
import { isUserInLeague } from '../../api/userLeaguesApi'; // Import the API call for activeLeague

const PermissionsContext = createContext();

// Available background patterns
const BACKGROUND_PATTERNS = ['none', 'grid', 'dots', 'hex', 'topo', 'noise', 'gradient'];

export const PermissionsProvider = ({ children }) => {
    const [permissions, setPermissions] = useState([]);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [darkMode, setDarkMode] = useState(true); // Default to dark mode
    const [bgPattern, setBgPattern] = useState('none'); // Background pattern
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

            // Fetch user settings (including dark mode and background pattern)
            const darkModeSetting = await getUserSetting('dark_mode'); // Fetch dark_mode setting
            setDarkMode(darkModeSetting.value === 'true'); // Set dark mode based on the backend value

            // Fetch background pattern setting
            try {
                const bgPatternSetting = await getUserSetting('bg_pattern');
                if (bgPatternSetting.value && BACKGROUND_PATTERNS.includes(bgPatternSetting.value)) {
                    setBgPattern(bgPatternSetting.value);
                }
            } catch {
                // Setting doesn't exist yet, use default
            }

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

    // Cycle through background patterns
    const cycleBackgroundPattern = async () => {
        const currentIndex = BACKGROUND_PATTERNS.indexOf(bgPattern);
        const nextIndex = (currentIndex + 1) % BACKGROUND_PATTERNS.length;
        const newPattern = BACKGROUND_PATTERNS[nextIndex];
        setBgPattern(newPattern);
        try {
            await updateUserSetting('bg_pattern', newPattern);
        } catch (err) {
            console.error('Failed to update background pattern setting:', err);
        }
    };

    // Set specific background pattern
    const setBackgroundPattern = async (pattern) => {
        if (BACKGROUND_PATTERNS.includes(pattern)) {
            setBgPattern(pattern);
            try {
                await updateUserSetting('bg_pattern', pattern);
            } catch (err) {
                console.error('Failed to update background pattern setting:', err);
            }
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

    useEffect(() => {
        // Apply background pattern class to the body
        // Remove all pattern classes first
        BACKGROUND_PATTERNS.forEach(p => {
            document.body.classList.remove(`pattern-${p}`);
        });
        // Add the current pattern class
        document.body.classList.add(`pattern-${bgPattern}`);
    }, [bgPattern]); // Runs whenever bgPattern changes

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
                bgPattern, // Expose current background pattern
                cycleBackgroundPattern, // Expose cycle function
                setBackgroundPattern, // Expose direct setter
                backgroundPatterns: BACKGROUND_PATTERNS, // Expose available patterns
                refreshUserData, // Expose refresh function
            }}
        >
            {children}
        </PermissionsContext.Provider>
    );
};

export const usePermissions = () => useContext(PermissionsContext);