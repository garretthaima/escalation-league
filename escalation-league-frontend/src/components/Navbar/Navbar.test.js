import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Navbar from './Navbar';

// Mock dependencies
const mockToggleDarkMode = jest.fn();
const mockPermissionsContext = {
    permissions: [],
    user: null,
    darkMode: false,
    toggleDarkMode: mockToggleDarkMode,
    activeLeague: null,
    loading: false
};

jest.mock('../../context/PermissionsProvider', () => ({
    usePermissions: () => mockPermissionsContext
}));

jest.mock('./ProfileSection', () => {
    return function MockProfileSection({ user }) {
        return user
            ? <div data-testid="profile-section">Profile: {user.firstname}</div>
            : <div data-testid="profile-section">Not logged in</div>;
    };
});

jest.mock('./NotificationCenter', () => {
    return function MockNotificationCenter() {
        return <div data-testid="notification-center">Notifications</div>;
    };
});

jest.mock('./navbarLinks', () => {
    return (inLeague) => [
        { path: '/', label: 'Home', type: 'link', section: 'public', order: 1 },
        { path: '/pods', label: 'Pods', type: 'link', section: 'pods', order: 2 },
        { path: '/admin', label: 'Admin', type: 'link', section: 'admin', order: 3 },
        ...(inLeague ? [{ path: '/leaderboard', label: 'Leaderboard', type: 'link', section: 'public', order: 4 }] : [])
    ];
});

// Mock window.innerWidth for mobile tests
const setWindowWidth = (width) => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
    window.dispatchEvent(new Event('resize'));
};

describe('Navbar', () => {
    const defaultProps = {
        handleLogout: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset mock context
        mockPermissionsContext.user = null;
        mockPermissionsContext.permissions = [];
        mockPermissionsContext.activeLeague = null;
        mockPermissionsContext.darkMode = false;
        mockPermissionsContext.loading = false;
        // Reset window width
        setWindowWidth(1024);
    });

    describe('basic rendering', () => {
        it('should render navbar element', () => {
            render(<Navbar {...defaultProps} />);
            expect(screen.getByRole('navigation')).toBeInTheDocument();
        });

        it('should render brand link with logo', () => {
            render(<Navbar {...defaultProps} />);
            expect(screen.getByAltText('Escalation League Logo')).toBeInTheDocument();
        });

        it('should render brand text', () => {
            render(<Navbar {...defaultProps} />);
            expect(screen.getByText('Escalation League')).toBeInTheDocument();
        });

        it('should render toggle button for mobile', () => {
            render(<Navbar {...defaultProps} />);
            expect(screen.getByRole('button', { name: /toggle navigation/i })).toBeInTheDocument();
        });
    });

    describe('public links', () => {
        it('should always show Home link', () => {
            render(<Navbar {...defaultProps} />);
            expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
        });
    });

    describe('authenticated user', () => {
        beforeEach(() => {
            mockPermissionsContext.user = { id: 1, firstname: 'John', lastname: 'Doe' };
            mockPermissionsContext.permissions = [{ name: 'pod_read' }];
        });

        it('should show notification center when user is logged in', () => {
            render(<Navbar {...defaultProps} />);
            expect(screen.getByTestId('notification-center')).toBeInTheDocument();
        });

        it('should show profile section', () => {
            render(<Navbar {...defaultProps} />);
            expect(screen.getByTestId('profile-section')).toBeInTheDocument();
        });

        it('should show Pods link when user has pod_read permission', () => {
            render(<Navbar {...defaultProps} />);
            expect(screen.getByRole('link', { name: /pods/i })).toBeInTheDocument();
        });
    });

    describe('user without permissions', () => {
        beforeEach(() => {
            mockPermissionsContext.user = { id: 1, firstname: 'John', lastname: 'Doe' };
            mockPermissionsContext.permissions = [];
        });

        it('should not show Pods link without pod_read permission', () => {
            render(<Navbar {...defaultProps} />);
            expect(screen.queryByRole('link', { name: /pods/i })).not.toBeInTheDocument();
        });

        it('should not show Admin link without admin permission', () => {
            render(<Navbar {...defaultProps} />);
            expect(screen.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument();
        });
    });

    describe('admin permissions', () => {
        beforeEach(() => {
            mockPermissionsContext.user = { id: 1, firstname: 'Admin', lastname: 'User' };
            mockPermissionsContext.permissions = [{ name: 'admin_page_access' }];
        });

        it('should show Admin link with admin permission', () => {
            render(<Navbar {...defaultProps} />);
            expect(screen.getByRole('link', { name: /admin/i })).toBeInTheDocument();
        });
    });

    describe('league-specific links', () => {
        beforeEach(() => {
            mockPermissionsContext.user = { id: 1, firstname: 'John', lastname: 'Doe' };
        });

        it('should show leaderboard when in a league', () => {
            mockPermissionsContext.activeLeague = { id: 1, name: 'Test League' };
            render(<Navbar {...defaultProps} />);
            expect(screen.getByRole('link', { name: /leaderboard/i })).toBeInTheDocument();
        });

        it('should not show leaderboard when not in a league', () => {
            mockPermissionsContext.activeLeague = null;
            render(<Navbar {...defaultProps} />);
            expect(screen.queryByRole('link', { name: /leaderboard/i })).not.toBeInTheDocument();
        });
    });

    describe('loading state', () => {
        beforeEach(() => {
            mockPermissionsContext.user = { id: 1, firstname: 'John', lastname: 'Doe' };
            mockPermissionsContext.loading = true;
        });

        it('should show loading indicator when loading and user exists', () => {
            render(<Navbar {...defaultProps} />);
            expect(screen.getByText(/loading/i)).toBeInTheDocument();
        });
    });

    describe('unauthenticated user', () => {
        beforeEach(() => {
            mockPermissionsContext.user = null;
        });

        it('should not show notification center when not logged in', () => {
            render(<Navbar {...defaultProps} />);
            expect(screen.queryByTestId('notification-center')).not.toBeInTheDocument();
        });

        it('should show profile section (sign in)', () => {
            render(<Navbar {...defaultProps} />);
            expect(screen.getByTestId('profile-section')).toBeInTheDocument();
            expect(screen.getByText('Not logged in')).toBeInTheDocument();
        });
    });

    describe('mobile navigation', () => {
        beforeEach(() => {
            setWindowWidth(768);
            mockPermissionsContext.user = { id: 1, firstname: 'John', lastname: 'Doe' };
        });

        it('should show profile link in mobile menu', () => {
            render(<Navbar {...defaultProps} />);
            const profileLinks = screen.getAllByText(/profile/i);
            expect(profileLinks.length).toBeGreaterThan(0);
        });

        it('should show dark mode toggle in mobile menu', () => {
            render(<Navbar {...defaultProps} />);
            expect(screen.getByText(/dark mode/i)).toBeInTheDocument();
        });

        it('should show logout in mobile menu', () => {
            render(<Navbar {...defaultProps} />);
            expect(screen.getByText(/logout/i)).toBeInTheDocument();
        });

        it('should call handleLogout when logout clicked', () => {
            render(<Navbar {...defaultProps} />);
            const logoutButton = screen.getByText(/logout/i);
            fireEvent.click(logoutButton);
            expect(defaultProps.handleLogout).toHaveBeenCalled();
        });
    });

    describe('active link highlighting', () => {
        beforeEach(() => {
            // Mock useLocation to return specific path
            jest.spyOn(require('react-router-dom'), 'useLocation').mockReturnValue({
                pathname: '/pods'
            });
            mockPermissionsContext.user = { id: 1, firstname: 'John' };
            mockPermissionsContext.permissions = [{ name: 'pod_read' }];
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should mark active link based on current path', () => {
            render(<Navbar {...defaultProps} />);
            const podsLink = screen.getByRole('link', { name: /pods/i });
            expect(podsLink).toHaveClass('active');
        });
    });
});
