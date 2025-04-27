import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import SignIn from './components/Auth/SignIn'; // Updated import for SignIn
import SignInLocal from './components/Auth/SignInLocal';
import Profile from './components/Auth/Profile/Profile';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Navbar from './components/Shared/Navbar';
import Leagues from './components/Leagues/Leagues';
import CurrentLeague from './components/Leagues/CurrentLeague';
import SignUp from './components/Leagues/SignUp';
import PastLeagues from './components/Leagues/PastLeagues';
import LeagueLeaderboard from './components/Leagues/LeagueLeaderboard';
import LogGame from './components/Games/LogGame';
import LogPodResult from './components/Games/LogPodResult';
import CreatePod from './components/Games/CreatePod';
import PodList from './components/Games/PodList';
import AdminPage from './components/Admin/AdminPage';
import LeagueAdminPage from './components/Admin/LeagueAdminPage';
import Rules from './components/Static/Rules';
import Awards from './components/Static/Awards';
import NotAuthorized from './components/Auth/NotAuthorized';
import { getUserProfile } from './api/authApi';

const App = () => {
    const [user, setUser] = useState(null);

    useEffect(() => {
        getUserProfile()
            .then((data) => {
                setUser(data.user);
            })
            .catch((err) => {
                console.error('Error fetching user data:', err.message);
            });
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.href = '/signin'; // Redirect to the updated /signin route
    };

    return (
        <div>
            <Navbar user={user} handleLogout={handleLogout} />
            <Routes>
                {/* Public Routes */}
                <Route path="/signin" element={<SignIn />} /> {/* Updated route */}
                <Route path="/signin/local" element={<SignInLocal />} />
                <Route path="/rules" element={<Rules />} />
                <Route path="/awards" element={<Awards />} />

                {/* Leagues Section */}
                <Route path="/leagues" element={<Leagues />}>
                    <Route path="current" element={<CurrentLeague />} />
                    <Route path="signup" element={<SignUp />} />
                    <Route path="leaderboard" element={<LeagueLeaderboard />} />
                    <Route path="past" element={<PastLeagues />} />
                </Route>

                {/* Games Section (Protected for Logged-In Users) */}
                <Route
                    path="/games/log"
                    element={
                        <ProtectedRoute>
                            <LogGame />
                        </ProtectedRoute>
                    }
                />

                {/* Profile Section (Protected for Logged-In Users) */}
                <Route
                    path="/profile"
                    element={
                        <ProtectedRoute>
                            <Profile />
                        </ProtectedRoute>
                    }
                />

                {/* Admin Section (Protected for Admins Only) */}
                <Route
                    path="/admin"
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <AdminPage />
                        </ProtectedRoute>
                    }
                />

                {/* League Admin Section (Protected for League Admins and Admins) */}
                <Route
                    path="/league-admin"
                    element={
                        <ProtectedRoute allowedRoles={['league_admin', 'admin']}>
                            <LeagueAdminPage />
                        </ProtectedRoute>
                    }
                />

                {/* Not Authorized Page */}
                <Route path="/not-authorized" element={<NotAuthorized />} />
            </Routes>
        </div>
    );
};

export default App;