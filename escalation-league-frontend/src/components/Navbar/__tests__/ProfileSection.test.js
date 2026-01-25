import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProfileSection from '../ProfileSection';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    Link: ({ children, to, onClick, className }) => (
        <a href={to} onClick={onClick} className={className} data-testid={`link-${to}`}>
            {children}
        </a>
    ),
    NavLink: ({ children, to, className }) => <a href={to} className={typeof className === 'function' ? className({ isActive: false }) : className}>{children}</a>,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/' }),
    MemoryRouter: ({ children }) => <>{children}</>,
}));

// Mock createPortal
jest.mock('react-dom', () => {
    const originalModule = jest.requireActual('react-dom');
    return {
        ...originalModule,
        createPortal: (node) => node,
    };
});

describe('ProfileSection', () => {
    const defaultProps = {
        user: null,
        handleLogout: jest.fn(),
        darkMode: false,
        toggleDarkMode: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset window size
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 1024,
        });
    });

    const renderWithRouter = (props = {}) => {
        return render(
            <MemoryRouter>
                <ProfileSection {...defaultProps} {...props} />
            </MemoryRouter>
        );
    };

    describe('unauthenticated user (user = null)', () => {
        it('should render Sign In link when user is null', () => {
            renderWithRouter({ user: null });
            expect(screen.getByText('Sign In')).toBeInTheDocument();
        });

        it('should link to /signin', () => {
            renderWithRouter({ user: null });
            const link = screen.getByTestId('link-/signin');
            expect(link).toHaveAttribute('href', '/signin');
        });

        it('should apply btn-outline-dark class in light mode', () => {
            renderWithRouter({ user: null, darkMode: false });
            const link = screen.getByText('Sign In');
            expect(link).toHaveClass('btn-outline-dark');
        });

        it('should apply btn-outline-light class in dark mode', () => {
            renderWithRouter({ user: null, darkMode: true });
            const link = screen.getByText('Sign In');
            expect(link).toHaveClass('btn-outline-light');
        });

        it('should have btn class', () => {
            renderWithRouter({ user: null });
            const link = screen.getByText('Sign In');
            expect(link).toHaveClass('btn');
        });
    });

    describe('authenticated user', () => {
        const mockUser = {
            id: 1,
            firstname: 'John',
            lastname: 'Doe',
            picture: null,
        };

        it('should render profile button when user is authenticated', () => {
            renderWithRouter({ user: mockUser });
            expect(screen.getByRole('button')).toBeInTheDocument();
        });

        it('should render profile avatar image', () => {
            renderWithRouter({ user: mockUser });
            const avatar = screen.getByAltText('Profile');
            expect(avatar).toBeInTheDocument();
        });

        it('should have profile-section-btn class on button', () => {
            renderWithRouter({ user: mockUser });
            const button = screen.getByRole('button');
            expect(button).toHaveClass('profile-section-btn');
        });

        it('should have rounded-circle class on avatar', () => {
            renderWithRouter({ user: mockUser });
            const avatar = screen.getByAltText('Profile');
            expect(avatar).toHaveClass('rounded-circle');
        });
    });

    describe('profile picture handling', () => {
        it('should use default avatar when picture is null', () => {
            const user = { id: 1, firstname: 'John', picture: null };
            renderWithRouter({ user });
            const avatar = screen.getByAltText('Profile');
            expect(avatar).toHaveAttribute('src', '/images/profile-pictures/avatar1.png');
        });

        it('should use default avatar when picture is undefined', () => {
            const user = { id: 1, firstname: 'John' };
            renderWithRouter({ user });
            const avatar = screen.getByAltText('Profile');
            expect(avatar).toHaveAttribute('src', '/images/profile-pictures/avatar1.png');
        });

        it('should use default avatar when picture is empty string', () => {
            const user = { id: 1, firstname: 'John', picture: '' };
            renderWithRouter({ user });
            const avatar = screen.getByAltText('Profile');
            expect(avatar).toHaveAttribute('src', '/images/profile-pictures/avatar1.png');
        });

        it('should use Google OAuth picture URL directly', () => {
            const googlePictureUrl = 'https://lh3.googleusercontent.com/a/ACg8ocLExample';
            const user = { id: 1, firstname: 'John', picture: googlePictureUrl };
            renderWithRouter({ user });
            const avatar = screen.getByAltText('Profile');
            expect(avatar).toHaveAttribute('src', googlePictureUrl);
        });

        it('should use http URL directly', () => {
            const httpUrl = 'http://example.com/avatar.png';
            const user = { id: 1, firstname: 'John', picture: httpUrl };
            renderWithRouter({ user });
            const avatar = screen.getByAltText('Profile');
            expect(avatar).toHaveAttribute('src', httpUrl);
        });

        it('should use local avatar path as-is', () => {
            const localPath = '/images/profile-pictures/avatar5.png';
            const user = { id: 1, firstname: 'John', picture: localPath };
            renderWithRouter({ user });
            const avatar = screen.getByAltText('Profile');
            expect(avatar).toHaveAttribute('src', localPath);
        });
    });

    describe('dropdown toggle', () => {
        const mockUser = { id: 1, firstname: 'John' };

        it('should open dropdown when profile button is clicked', () => {
            renderWithRouter({ user: mockUser });
            const button = screen.getByRole('button');
            fireEvent.click(button);
            expect(screen.getByText('Profile')).toBeInTheDocument();
        });

        it('should close dropdown when profile button is clicked again', () => {
            renderWithRouter({ user: mockUser });
            const button = screen.getByRole('button');

            // Open
            fireEvent.click(button);
            expect(screen.getByText('Profile')).toBeInTheDocument();

            // Close
            fireEvent.click(button);
            expect(screen.queryByText('Profile')).not.toBeInTheDocument();
        });

        it('should render dropdown menu with correct class', () => {
            renderWithRouter({ user: mockUser });
            const button = screen.getByRole('button');
            fireEvent.click(button);

            const dropdown = screen.getByRole('list');
            expect(dropdown).toHaveClass('profile-custom-dropdown');
        });
    });

    describe('dropdown menu items', () => {
        const mockUser = { id: 1, firstname: 'John' };

        beforeEach(() => {
            renderWithRouter({ user: mockUser });
            const button = screen.getByRole('button');
            fireEvent.click(button);
        });

        it('should render Profile link', () => {
            expect(screen.getByText('Profile')).toBeInTheDocument();
        });

        it('should navigate to /profile when Profile is clicked', () => {
            const profileLink = screen.getByTestId('link-/profile');
            expect(profileLink).toHaveAttribute('href', '/profile');
        });

        it('should render dark mode toggle button', () => {
            expect(screen.getByText('Dark Mode')).toBeInTheDocument();
        });

        it('should render Logout button', () => {
            expect(screen.getByText('Logout')).toBeInTheDocument();
        });

        it('should render divider between dark mode and logout', () => {
            const divider = document.querySelector('.dropdown-divider');
            expect(divider).toBeInTheDocument();
        });

        it('should have icons for menu items', () => {
            const profileIcon = document.querySelector('.fa-user');
            const logoutIcon = document.querySelector('.fa-sign-out-alt');
            expect(profileIcon).toBeInTheDocument();
            expect(logoutIcon).toBeInTheDocument();
        });
    });

    describe('dark mode toggle', () => {
        const mockUser = { id: 1, firstname: 'John' };

        it('should show Dark Mode text when in light mode', () => {
            renderWithRouter({ user: mockUser, darkMode: false });
            const button = screen.getByRole('button');
            fireEvent.click(button);
            expect(screen.getByText('Dark Mode')).toBeInTheDocument();
        });

        it('should show Light Mode text when in dark mode', () => {
            renderWithRouter({ user: mockUser, darkMode: true });
            const button = screen.getByRole('button');
            fireEvent.click(button);
            expect(screen.getByText('Light Mode')).toBeInTheDocument();
        });

        it('should show moon icon when in light mode', () => {
            const { container } = renderWithRouter({ user: mockUser, darkMode: false });
            const button = screen.getByRole('button');
            fireEvent.click(button);
            expect(container.querySelector('.fa-moon')).toBeInTheDocument();
        });

        it('should show sun icon when in dark mode', () => {
            const { container } = renderWithRouter({ user: mockUser, darkMode: true });
            const button = screen.getByRole('button');
            fireEvent.click(button);
            expect(container.querySelector('.fa-sun')).toBeInTheDocument();
        });

        it('should call toggleDarkMode when dark mode button is clicked', () => {
            const toggleDarkMode = jest.fn();
            renderWithRouter({ user: mockUser, toggleDarkMode });
            const profileButton = screen.getByRole('button');
            fireEvent.click(profileButton);

            const darkModeButton = screen.getByText('Dark Mode');
            fireEvent.click(darkModeButton);
            expect(toggleDarkMode).toHaveBeenCalled();
        });

        it('should close dropdown after toggling dark mode', () => {
            const toggleDarkMode = jest.fn();
            renderWithRouter({ user: mockUser, toggleDarkMode });
            const profileButton = screen.getByRole('button');
            fireEvent.click(profileButton);

            const darkModeButton = screen.getByText('Dark Mode');
            fireEvent.click(darkModeButton);

            expect(screen.queryByText('Dark Mode')).not.toBeInTheDocument();
        });
    });

    describe('logout functionality', () => {
        const mockUser = { id: 1, firstname: 'John' };

        it('should call handleLogout when logout is clicked', () => {
            const handleLogout = jest.fn();
            renderWithRouter({ user: mockUser, handleLogout });
            const profileButton = screen.getByRole('button');
            fireEvent.click(profileButton);

            const logoutButton = screen.getByText('Logout');
            fireEvent.click(logoutButton);
            expect(handleLogout).toHaveBeenCalled();
        });

        it('should close dropdown after logout', () => {
            const handleLogout = jest.fn();
            renderWithRouter({ user: mockUser, handleLogout });
            const profileButton = screen.getByRole('button');
            fireEvent.click(profileButton);

            const logoutButton = screen.getByText('Logout');
            fireEvent.click(logoutButton);

            expect(screen.queryByText('Logout')).not.toBeInTheDocument();
        });
    });

    describe('profile link click', () => {
        const mockUser = { id: 1, firstname: 'John' };

        it('should close dropdown when Profile link is clicked', () => {
            renderWithRouter({ user: mockUser });
            const profileButton = screen.getByRole('button');
            fireEvent.click(profileButton);

            const profileLink = screen.getByText('Profile');
            fireEvent.click(profileLink);

            expect(screen.queryByText('Logout')).not.toBeInTheDocument();
        });
    });

    describe('click outside handling', () => {
        const mockUser = { id: 1, firstname: 'John' };

        it('should close dropdown when clicking outside', async () => {
            renderWithRouter({ user: mockUser });
            const profileButton = screen.getByRole('button');
            fireEvent.click(profileButton);

            expect(screen.getByText('Profile')).toBeInTheDocument();

            // Click outside
            fireEvent.mouseDown(document.body);

            await waitFor(() => {
                expect(screen.queryByText('Profile')).not.toBeInTheDocument();
            });
        });
    });

    describe('mobile responsiveness', () => {
        const mockUser = { id: 1, firstname: 'John' };

        it('should apply mobile class when window width is less than 992', () => {
            Object.defineProperty(window, 'innerWidth', { value: 768 });
            renderWithRouter({ user: mockUser });

            const profileButton = screen.getByRole('button');
            fireEvent.click(profileButton);

            const dropdown = screen.getByRole('list');
            expect(dropdown).toHaveClass('profile-custom-dropdown--mobile');
        });

        it('should apply desktop class when window width is 992 or more', () => {
            Object.defineProperty(window, 'innerWidth', { value: 1024 });
            renderWithRouter({ user: mockUser });

            const profileButton = screen.getByRole('button');
            fireEvent.click(profileButton);

            const dropdown = screen.getByRole('list');
            expect(dropdown).toHaveClass('profile-custom-dropdown--desktop');
        });

        it('should handle window resize', async () => {
            Object.defineProperty(window, 'innerWidth', { value: 1024 });
            renderWithRouter({ user: mockUser });

            // Simulate resize to mobile
            act(() => {
                Object.defineProperty(window, 'innerWidth', { value: 768 });
                window.dispatchEvent(new Event('resize'));
            });

            const profileButton = screen.getByRole('button');
            fireEvent.click(profileButton);

            await waitFor(() => {
                const dropdown = screen.getByRole('list');
                expect(dropdown).toHaveClass('profile-custom-dropdown--mobile');
            });
        });
    });

    describe('dropdown item styling', () => {
        const mockUser = { id: 1, firstname: 'John' };

        it('should apply dropdown-item class to Profile link', () => {
            renderWithRouter({ user: mockUser });
            const profileButton = screen.getByRole('button');
            fireEvent.click(profileButton);

            const profileLink = screen.getByText('Profile');
            expect(profileLink).toHaveClass('dropdown-item');
        });

        it('should apply profile-section-dropdown-link class to Profile link', () => {
            renderWithRouter({ user: mockUser });
            const profileButton = screen.getByRole('button');
            fireEvent.click(profileButton);

            const profileLink = screen.getByText('Profile');
            expect(profileLink).toHaveClass('profile-section-dropdown-link');
        });

        it('should apply profile-section-dropdown-btn class to buttons', () => {
            renderWithRouter({ user: mockUser });
            const profileButton = screen.getByRole('button');
            fireEvent.click(profileButton);

            const darkModeButton = screen.getByText('Dark Mode');
            const logoutButton = screen.getByText('Logout');
            expect(darkModeButton).toHaveClass('profile-section-dropdown-btn');
            expect(logoutButton).toHaveClass('profile-section-dropdown-btn');
        });
    });

    describe('cleanup', () => {
        const mockUser = { id: 1, firstname: 'John' };

        it('should remove event listeners on unmount', () => {
            const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
            const { unmount } = renderWithRouter({ user: mockUser });

            unmount();

            expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
            removeEventListenerSpy.mockRestore();
        });

        it('should remove mousedown listener on unmount', () => {
            const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
            const { unmount } = renderWithRouter({ user: mockUser });

            unmount();

            expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
            removeEventListenerSpy.mockRestore();
        });
    });

    describe('handleItemClick function', () => {
        const mockUser = { id: 1, firstname: 'John' };

        it('should handle item click without callback', () => {
            renderWithRouter({ user: mockUser });
            const profileButton = screen.getByRole('button');
            fireEvent.click(profileButton);

            const profileLink = screen.getByText('Profile');
            // This should not throw even though no callback is passed
            expect(() => fireEvent.click(profileLink)).not.toThrow();
        });

        it('should call callback when provided', () => {
            const handleLogout = jest.fn();
            renderWithRouter({ user: mockUser, handleLogout });
            const profileButton = screen.getByRole('button');
            fireEvent.click(profileButton);

            const logoutButton = screen.getByText('Logout');
            fireEvent.click(logoutButton);

            expect(handleLogout).toHaveBeenCalledTimes(1);
        });
    });
});
