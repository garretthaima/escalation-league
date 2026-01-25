import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LeagueLinks from '../LeagueLinks';

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

describe('LeagueLinks', () => {
    const defaultProps = {
        activeSection: '',
        setActiveSection: jest.fn(),
        inLeague: false,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const renderWithRouter = (props = {}) => {
        return render(
            <MemoryRouter>
                <LeagueLinks {...defaultProps} {...props} />
            </MemoryRouter>
        );
    };

    describe('basic rendering', () => {
        it('should render Leagues dropdown menu', () => {
            renderWithRouter();
            expect(screen.getByText('Leagues')).toBeInTheDocument();
        });

        it('should render dropdown toggle button', () => {
            renderWithRouter();
            const toggle = screen.getByRole('button', { name: /leagues/i });
            expect(toggle).toBeInTheDocument();
            expect(toggle).toHaveAttribute('data-bs-toggle', 'dropdown');
        });

        it('should have correct aria attributes', () => {
            renderWithRouter();
            const toggle = screen.getByRole('button', { name: /leagues/i });
            expect(toggle).toHaveAttribute('aria-expanded', 'false');
            expect(toggle).toHaveAttribute('id', 'leaguesDropdown');
        });

        it('should render dropdown menu with correct aria-labelledby', () => {
            renderWithRouter();
            const menu = screen.getByRole('list');
            expect(menu).toHaveAttribute('aria-labelledby', 'leaguesDropdown');
            expect(menu).toHaveClass('dropdown-menu');
        });

        it('should render nav-item with dropdown class', () => {
            const { container } = renderWithRouter();
            const navItem = container.querySelector('.nav-item.dropdown');
            expect(navItem).toBeInTheDocument();
        });
    });

    describe('when user is NOT in a league (inLeague = false)', () => {
        it('should show Sign Up link', () => {
            renderWithRouter({ inLeague: false });
            expect(screen.getByText('Sign Up')).toBeInTheDocument();
        });

        it('should not show Current League link', () => {
            renderWithRouter({ inLeague: false });
            expect(screen.queryByText('Current League')).not.toBeInTheDocument();
        });

        it('should not show Leaderboard link', () => {
            renderWithRouter({ inLeague: false });
            expect(screen.queryByText('Leaderboard')).not.toBeInTheDocument();
        });

        it('should navigate to /leagues/signup when Sign Up is clicked', () => {
            renderWithRouter({ inLeague: false });
            const link = screen.getByTestId('link-/leagues/signup');
            expect(link).toHaveAttribute('href', '/leagues/signup');
        });

        it('should call setActiveSection with signup when Sign Up is clicked', () => {
            const setActiveSection = jest.fn();
            renderWithRouter({ inLeague: false, setActiveSection });
            const link = screen.getByTestId('link-/leagues/signup');
            fireEvent.click(link);
            expect(setActiveSection).toHaveBeenCalledWith('signup');
        });

        it('should apply dropdown-item class to Sign Up link', () => {
            renderWithRouter({ inLeague: false });
            const link = screen.getByText('Sign Up');
            expect(link).toHaveClass('dropdown-item');
        });
    });

    describe('when user IS in a league (inLeague = true)', () => {
        it('should show Current League link', () => {
            renderWithRouter({ inLeague: true });
            expect(screen.getByText('Current League')).toBeInTheDocument();
        });

        it('should show Leaderboard link', () => {
            renderWithRouter({ inLeague: true });
            expect(screen.getByText('Leaderboard')).toBeInTheDocument();
        });

        it('should not show Sign Up link', () => {
            renderWithRouter({ inLeague: true });
            expect(screen.queryByText('Sign Up')).not.toBeInTheDocument();
        });

        it('should navigate to /leagues/current when Current League is clicked', () => {
            renderWithRouter({ inLeague: true });
            const link = screen.getByTestId('link-/leagues/current');
            expect(link).toHaveAttribute('href', '/leagues/current');
        });

        it('should call setActiveSection with currentLeague when Current League is clicked', () => {
            const setActiveSection = jest.fn();
            renderWithRouter({ inLeague: true, setActiveSection });
            const link = screen.getByTestId('link-/leagues/current');
            fireEvent.click(link);
            expect(setActiveSection).toHaveBeenCalledWith('currentLeague');
        });

        it('should navigate to /leagues/leaderboard when Leaderboard is clicked', () => {
            renderWithRouter({ inLeague: true });
            const link = screen.getByTestId('link-/leagues/leaderboard');
            expect(link).toHaveAttribute('href', '/leagues/leaderboard');
        });

        it('should call setActiveSection with leaderboard when Leaderboard is clicked', () => {
            const setActiveSection = jest.fn();
            renderWithRouter({ inLeague: true, setActiveSection });
            const link = screen.getByTestId('link-/leagues/leaderboard');
            fireEvent.click(link);
            expect(setActiveSection).toHaveBeenCalledWith('leaderboard');
        });

        it('should apply dropdown-item class to all links', () => {
            renderWithRouter({ inLeague: true });
            const links = screen.getAllByRole('link');
            expect(links).toHaveLength(2);
            links.forEach((link) => {
                expect(link).toHaveClass('dropdown-item');
            });
        });
    });

    describe('activeSection handling', () => {
        it('should pass activeSection prop correctly', () => {
            renderWithRouter({ activeSection: 'currentLeague', inLeague: true });
            // Component doesn't use activeSection for styling, but it should render
            expect(screen.getByText('Current League')).toBeInTheDocument();
        });

        it('should handle empty activeSection', () => {
            renderWithRouter({ activeSection: '', inLeague: true });
            expect(screen.getByText('Current League')).toBeInTheDocument();
            expect(screen.getByText('Leaderboard')).toBeInTheDocument();
        });
    });

    describe('conditional rendering logic', () => {
        it('should render exactly one link when not in league', () => {
            renderWithRouter({ inLeague: false });
            const links = screen.getAllByRole('link');
            expect(links).toHaveLength(1);
        });

        it('should render exactly two links when in league', () => {
            renderWithRouter({ inLeague: true });
            const links = screen.getAllByRole('link');
            expect(links).toHaveLength(2);
        });
    });
});
