import React, { useEffect, useState } from 'react';
import './App.css';
import { Route, Routes, Navigate } from 'react-router-dom';
import SignIn from './components/Auth/SignIn';
import VerifyEmail from './components/Auth/VerifyEmail';
import ForgotPassword from './components/Auth/ForgotPassword';
import ResetPassword from './components/Auth/ResetPassword';
import Profile from './components/Auth/Profile/Profile';
import Navbar from './components/Navbar/Navbar';
import LeagueLayout from './components/Leagues/LeagueLayout';
import { LeagueDashboard } from './components/Leagues/Dashboard';
import SignUp from './components/Leagues/SignUp';
import PastLeagues from './components/Leagues/PastLeagues';
import PriceCheckPage from './components/Leagues/PriceCheckPage';
import { PodsDashboard, PodsHistory } from './components/Pods';
import CreateLeaguePage from './components/Admin/CreateLeaguePage';
import Rules from './components/Static/Rules';
import Awards from './components/Static/Awards';
import NotAuthorized from './components/Auth/NotAuthorized';
import PublicProfile from './components/Auth/Profile/PublicProfile';
import { LeagueAdminPage, PodAdminPage, UserRoleManagementPage, AttendanceAdminPage, ActivityLogsPage } from './components/Admin';
import EditPodPage from './components/Admin/EditPodPage';
import { HomePage, Footer, Contact } from './components/Shared/';
import { ToastProvider } from './context/ToastContext';
import { WebSocketProvider } from './context/WebSocketProvider';
import { BudgetDashboard } from './components/Budget';
import { MetagameDashboard } from './components/Metagame';
import { AttendancePage, PodSuggestionsPage, MatchupMatrixPage } from './components/Attendance';
import { GlobalLeaderboard } from './components/Leaderboard';
import { logoutUser } from './api/authApi';
import { initializeAuth } from './api/axiosConfig';

const App = () => {
    const [user, setUser] = useState(null);

    // Proactively check and refresh token on app initialization
    useEffect(() => {
        const initAuth = async () => {
            const isValid = await initializeAuth();

            if (isValid) {
                // Token is valid (or was refreshed), decode and set user
                const token = localStorage.getItem('token');
                if (token) {
                    try {
                        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
                        setUser({
                            id: tokenPayload.id,
                            email: tokenPayload.email,
                            role_id: tokenPayload.role_id,
                        });
                    } catch (err) {
                        console.error('Error decoding token:', err);
                        localStorage.removeItem('token');
                        localStorage.removeItem('refreshToken');
                    }
                }
            }
        };

        initAuth();
    }, []);

    const handleLogout = async () => {
        // Call API to revoke refresh token on server
        await logoutUser();

        // Clear user state
        setUser(null);

        // Force page reload to clear all React state
        window.location.href = '/signin';
    };

    return (
        <WebSocketProvider>
            <ToastProvider>
                <div id="root">
                    <Navbar user={user} handleLogout={handleLogout} />
                    < div className="content">
                        <Routes>
                            {/* Public Routes */}
                            <Route path="/" element={<HomePage />} />
                            <Route path="/signin" element={<SignIn />} />
                            <Route path="/verify-email" element={<VerifyEmail />} />
                            <Route path="/forgot-password" element={<ForgotPassword />} />
                            <Route path="/reset-password" element={<ResetPassword />} />
                            <Route path="/rules" element={<Rules />} />
                            <Route path="/awards" element={<Awards />} />
                            <Route path="/contact" element={<Contact />} />
                            <Route path="/leaderboard" element={<GlobalLeaderboard />} />
                            {/* <Route path="/privacy" element={<PrivacyPolicy />} /> Add Privacy Policy Route */}


                            {/* Leagues Section */}
                            {/* Main dashboard - no nested layout wrapper */}
                            <Route path="/leagues" element={<LeagueDashboard />} />
                            <Route path="/leagues/signup" element={<SignUp />} />

                            {/* Tool pages with shared layout */}
                            <Route path="/leagues" element={<LeagueLayout />}>
                                <Route path="budget" element={<BudgetDashboard />} />
                                <Route path="price-check" element={<PriceCheckPage />} />
                                <Route path="metagame" element={<MetagameDashboard />} />
                            </Route>

                            {/* Legacy routes - redirect to new dashboard */}
                            <Route path="/leagues/current" element={<Navigate to="/leagues" replace />} />
                            <Route path="/leagues/leaderboard" element={<Navigate to="/leagues" replace />} />
                            <Route path="/leagues/past" element={<PastLeagues />} />

                            {/* Pods/Games Section */}
                            <Route path="/pods" element={<PodsDashboard />} />
                            <Route path="/pods/history" element={<PodsHistory />} />
                            {/* Legacy routes - redirect to new dashboard */}
                            <Route path="/pods/active" element={<Navigate to="/pods" replace />} />
                            <Route path="/pods/complete" element={<Navigate to="/pods/history" replace />} />
                            <Route path="/pods/pending" element={<Navigate to="/pods" replace />} />

                            {/* Profile Section */}
                            <Route path="/profile" element={<Profile />} />

                            {/* Profile Section */}
                            <Route path="/leagues/:leagueId/profile/:userId" element={<PublicProfile />} />

                            {/* Attendance Section */}
                            <Route path="/attendance" element={<AttendancePage />} />
                            <Route path="/attendance/suggest-pods/:sessionId" element={<PodSuggestionsPage />} />

                            {/* Admin Section */}
                            <Route path="/admin/leagues" element={<LeagueAdminPage />} />
                            <Route path="/admin/pods" element={<PodAdminPage />} />
                            <Route path="/admin/pods/:podId" element={<EditPodPage />} />
                            <Route path="/admin/leagues/create" element={<CreateLeaguePage />} />
                            <Route path="/admin/users" element={<UserRoleManagementPage />} />
                            <Route path="/admin/attendance" element={<AttendanceAdminPage />} />
                            <Route path="/admin/matchup-matrix" element={<MatchupMatrixPage />} />
                            <Route path="/admin/activity-logs" element={<ActivityLogsPage />} />


                            {/* Not Authorized Page */}
                            <Route path="/not-authorized" element={<NotAuthorized />} />

                        </Routes>
                    </div>
                    <Footer />
                </div>
            </ToastProvider>
        </WebSocketProvider>
    );
};

export default App;