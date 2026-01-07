import React, { createContext, useContext, useEffect, useState } from 'react';
import { getUserPermissions, getUserProfile, getUserSetting, updateUserSetting } from '../../api/usersApi'; // Add API calls
import { useNavigate } from 'react-router-dom';
import { isUserInLeague } from '../../api/userLeaguesApi'; // Import the API call for activeLeague

const PermissionsContext = createContext();

export const PermissionsProvider = ({ children }) => {
    const [permissions, setPermissions] = useState([]);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [darkMode, setDarkMode] = useState(true); // Default to dark mode
    const [activeLeague, setActiveLeague] = useState(null); // Add activeLeague state
    const navigate = useNavigate();

    useEffect(() => {
        const checkTokenExpiration = () => {
            const token = localStorage.getItem('token');
            if (token) {
                const { exp } = JSON.parse(atob(token.split('.')[1])); // Decode JWT to get expiration
                if (Date.now() >= exp * 1000) {
                    // Token has expired
                    localStorage.removeItem('token'); // Clear the token
                    return false; // Stop further execution
                }
            }
            return !!token; // Return true if token exists and is valid
        };

        const fetchPermissionsAndUser = async () => {
            if (!checkTokenExpiration()) {
                setLoading(false); // Stop loading if token is invalid
                return;
            }

            try {
                // Fetch permissions
                const permissionsData = await getUserPermissions();
                setPermissions(permissionsData.permissions);

                // Fetch user profile
                const profileData = await getUserProfile();
                setUser(profileData.user); // Store the full user object

                // Fetch user settings (including dark mode)
                const darkModeSetting = await getUserSetting('dark_mode'); // Fetch dark_mode setting
                setDarkMode(darkModeSetting.value === 'true'); // Set dark mode based on the backend value

                // Fetch active league
                const { inLeague, league } = await isUserInLeague();
                if (inLeague) {
                    setActiveLeague(league);
                } else {
                    setActiveLeague(null);
                }
            } catch (err) {
                console.error('Failed to fetch permissions, user profile, or settings:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchPermissionsAndUser();
    }, []); // Runs only once when the provider mounts

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
            }}
        >
            {children}
        </PermissionsContext.Provider>
    );
};

export const usePermissions = () => useContext(PermissionsContext);