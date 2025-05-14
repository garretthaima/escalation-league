import React, { useEffect, useState } from 'react';
import './App.css';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import SignIn from './components/Auth/SignIn';
import Profile from './components/Auth/Profile/Profile';
import Navbar from './components/Navbar/Navbar';
import LeaguesPage from './components/Leagues/LeaguesPage';
import CurrentLeague from './components/Leagues/CurrentLeague';
import SignUp from './components/Leagues/SignUp';
import PastLeagues from './components/Leagues/PastLeagues';
import LeagueLeaderboard from './components/Leagues/LeagueLeaderboard';
import PriceCheckPage from './components/Leagues/PriceCheckPage';
import { GamesPage, CompletedGamesPage, ConfirmGamesPage, ActiveGamesPage } from './components/Games';
import CreateLeaguePage from './components/Admin/CreateLeaguePage';
import Rules from './components/Static/Rules';
import Awards from './components/Static/Awards';
import NotAuthorized from './components/Auth/NotAuthorized';
import PublicProfile from './components/Auth/Profile/PublicProfile';
import { LeagueAdminPage, PodAdminPage } from './components/Admin';
import { HomePage, Footer, Contact } from './components/Shared/';

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
        <div id="root">
            <Navbar user={user} handleLogout={handleLogout} />
            < div className="content">
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/signin" element={<SignIn />} />
                    <Route path="/rules" element={<Rules />} />
                    <Route path="/awards" element={<Awards />} />
                    <Route path="/contact" element={<Contact />} />
                    {/* <Route path="/privacy" element={<PrivacyPolicy />} /> Add Privacy Policy Route */}


                    {/* Leagues Section */}
                    <Route path="/leagues" element={<LeaguesPage />}>
                        <Route path="current" element={<CurrentLeague />} />
                        <Route path="signup" element={<SignUp />} />
                        <Route path="leaderboard" element={<LeagueLeaderboard />} />
                        <Route path="price-check" element={<PriceCheckPage />} />
                        <Route path="past" element={<PastLeagues />} />
                    </Route>

                    {/* Games Section */}
                    <Route path="/pods" element={<GamesPage />}>
                        <Route path="active" element={<ActiveGamesPage />} />
                        <Route path="complete" element={<CompletedGamesPage />} />
                        <Route path="pending" element={<ConfirmGamesPage />} />
                    </Route>

                    {/* Profile Section */}
                    <Route path="/profile" element={<Profile />} />

                    {/* Profile Section */}
                    <Route path="/profile/:userId" element={<PublicProfile />} />

                    {/* Admin Section */}
                    <Route path="/admin/leagues" element={<LeagueAdminPage />} />
                    <Route path="/admin/pods" element={<PodAdminPage />} />
                    <Route path="/admin/leagues/create" element={<CreateLeaguePage />} />


                    {/* Not Authorized Page */}
                    <Route path="/not-authorized" element={<NotAuthorized />} />

                </Routes>
            </div>
            <Footer />
        </div>
    );
};

export default App;