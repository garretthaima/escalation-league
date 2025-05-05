import React, { createContext, useContext, useEffect, useState } from 'react';
import { getUserPermissions, getUserProfile } from '../../api/usersApi';

const PermissionsContext = createContext();

export const PermissionsProvider = ({ children }) => {
    const [permissions, setPermissions] = useState([]);
    const [user, setUser] = useState(null); // Add user state
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPermissionsAndUser = async () => {
            try {
                // Fetch permissions
                const permissionsData = await getUserPermissions();
                setPermissions(permissionsData.permissions);
                console.log('Permissions fetched:', permissionsData.permissions);

                // Fetch user profile
                const profileData = await getUserProfile();
                setUser(profileData.user); // Store the full user object
                console.log('User profile fetched:', profileData.user);
            } catch (err) {
                console.error('Failed to fetch permissions or user profile:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchPermissionsAndUser();
    }, []); // Runs only once when the provider mounts

    return (
        <PermissionsContext.Provider value={{ permissions, user, loading }}>
            {children}
        </PermissionsContext.Provider>
    );
};

export const usePermissions = () => useContext(PermissionsContext);