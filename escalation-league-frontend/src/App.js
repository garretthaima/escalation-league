import React, { useEffect, useState, Suspense, lazy } from 'react';
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
import { PodsDashboard, PodsHistory } from './components/Pods';
import Rules from './components/Static/Rules';
import Awards from './components/Static/Awards';
import NotAuthorized from './components/Auth/NotAuthorized';
import PublicProfile from './components/Auth/Profile/PublicProfile';
import { HomePage, Footer, Contact } from './components/Shared/';
import { ToastProvider } from './context/ToastContext';
import { WebSocketProvider } from './context/WebSocketProvider';
import { AttendancePage, PodSuggestionsPage } from './components/Attendance';
import { GlobalLeaderboard } from './components/Leaderboard';
import LifeTracker from './components/LifeTracker/LifeTracker';
import { logoutUser } from './api/authApi';
import { initializeAuth } from './api/axiosConfig';

// Lazy load admin pages (not needed on initial load)
const LeagueAdminPage = lazy(() => import('./components/Admin/LeagueAdminPage'));
const PodAdminPage = lazy(() => import('./components/Admin/PodAdminPage'));
const UserRoleManagementPage = lazy(() => import('./components/Admin/UserRoleManagementPage'));
const AttendanceAdminPage = lazy(() => import('./components/Admin/AttendanceAdminPage'));
const ActivityLogsPage = lazy(() => import('./components/Admin/ActivityLogsPage'));
const CreateLeaguePage = lazy(() => import('./components/Admin/CreateLeaguePage'));
const EditPodPage = lazy(() => import('./components/Admin/EditPodPage'));
const MatchupMatrixPage = lazy(() => import('./components/Attendance/MatchupMatrixPage'));

// Lazy load heavy dashboard pages
const BudgetDashboard = lazy(() => import('./components/Budget/BudgetDashboard'));
const MetagameDashboard = lazy(() => import('./components/Metagame/MetagameDashboard'));
const PriceCheckPage = lazy(() => import('./components/Leagues/PriceCheckPage'));

// Loading fallback component
const PageLoader = () => (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
        </div>
    </div>
);

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
                            <Route path="/life-tracker/:podId?" element={<LifeTracker />} />
                            <Route path="/awards" element={<Awards />} />
                            <Route path="/contact" element={<Contact />} />
                            <Route path="/leaderboard" element={<GlobalLeaderboard />} />
                            {/* <Route path="/privacy" element={<PrivacyPolicy />} /> Add Privacy Policy Route */}


                            {/* Leagues Section */}
                            {/* Main dashboard - no nested layout wrapper */}
                            <Route path="/leagues" element={<LeagueDashboard />} />
                            <Route path="/leagues/signup" element={<SignUp />} />

                            {/* Tool pages with shared layout (lazy loaded) */}
                            <Route path="/leagues" element={<LeagueLayout />}>
                                <Route path="budget" element={<Suspense fallback={<PageLoader />}><BudgetDashboard /></Suspense>} />
                                <Route path="price-check" element={<Suspense fallback={<PageLoader />}><PriceCheckPage /></Suspense>} />
                                <Route path="metagame" element={<Suspense fallback={<PageLoader />}><MetagameDashboard /></Suspense>} />
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

                            {/* Admin Section (lazy loaded) */}
                            <Route path="/admin/leagues" element={<Suspense fallback={<PageLoader />}><LeagueAdminPage /></Suspense>} />
                            <Route path="/admin/pods" element={<Suspense fallback={<PageLoader />}><PodAdminPage /></Suspense>} />
                            <Route path="/admin/pods/:podId" element={<Suspense fallback={<PageLoader />}><EditPodPage /></Suspense>} />
                            <Route path="/admin/leagues/create" element={<Suspense fallback={<PageLoader />}><CreateLeaguePage /></Suspense>} />
                            <Route path="/admin/users" element={<Suspense fallback={<PageLoader />}><UserRoleManagementPage /></Suspense>} />
                            <Route path="/admin/attendance" element={<Suspense fallback={<PageLoader />}><AttendanceAdminPage /></Suspense>} />
                            <Route path="/admin/matchup-matrix" element={<Suspense fallback={<PageLoader />}><MatchupMatrixPage /></Suspense>} />
                            <Route path="/admin/activity-logs" element={<Suspense fallback={<PageLoader />}><ActivityLogsPage /></Suspense>} />


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