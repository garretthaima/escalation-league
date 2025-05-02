import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import SignIn from './components/Auth/SignIn';
import Profile from './components/Auth/Profile/Profile';
import Navbar from './components/Shared/Navbar';
import LeaguesPage from './components/Leagues/LeaguesPage';
import CurrentLeague from './components/Leagues/CurrentLeague';
import SignUp from './components/Leagues/SignUp';
import PastLeagues from './components/Leagues/PastLeagues';
import LeagueLeaderboard from './components/Leagues/LeagueLeaderboard';
import GamesPage from './components/Games/GamesPage';
import AdminPage from './components/Admin/AdminPage';
import Rules from './components/Static/Rules';
import Awards from './components/Static/Awards';
import NotAuthorized from './components/Auth/NotAuthorized';

const App = () => {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const tokenPayload = JSON.parse(atob(token.split('.')[1])); // Decode JWT payload
                setUser({
                    id: tokenPayload.id,
                    email: tokenPayload.email,
                    role_id: tokenPayload.role_id,
                });
            } catch (err) {
                console.error('Error decoding token:', err);
                localStorage.removeItem('token'); // Clear invalid token
            }
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token'); // Clear token from local storage
        setUser(null); // Clear user state
        window.location.href = '/signin'; // Redirect to sign-in page
    };

    return (
        <div>
            <Navbar user={user} handleLogout={handleLogout} />
            <Routes>
                {/* Public Routes */}
                <Route path="/signin" element={<SignIn />} />
                <Route path="/rules" element={<Rules />} />
                <Route path="/awards" element={<Awards />} />

                {/* Leagues Section */}
                <Route path="/leagues" element={<LeaguesPage />}>
                    <Route path="current" element={<CurrentLeague />} />
                    <Route path="signup" element={<SignUp />} />
                    <Route path="leaderboard" element={<LeagueLeaderboard />} />
                    <Route path="past" element={<PastLeagues />} />
                </Route>

                {/* Games Section */}
                <Route path="/games" element={<GamesPage />} />

                {/* Profile Section */}
                <Route path="/profile" element={<Profile />} />

                {/* Admin Section */}
                <Route path="/admin" element={<AdminPage />} />

                {/* Not Authorized Page */}
                <Route path="/not-authorized" element={<NotAuthorized />} />
            </Routes>
        </div>
    );
};

export default App;