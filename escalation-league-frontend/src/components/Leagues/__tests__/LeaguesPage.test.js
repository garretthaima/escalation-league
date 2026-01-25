import React from 'react';
import { render, screen } from '@testing-library/react';
import LeaguesPage from '../LeaguesPage';

// Mock react-router-dom
const mockLocation = { pathname: '/leagues/current' };
jest.mock('react-router-dom', () => ({
    Link: ({ to, children, className }) => (
        <a href={to} className={className} data-testid={`link-${to}`}>
            {children}
        </a>
    ),
    NavLink: ({ to, children, className }) => (
        <a href={to} className={className} data-testid={`link-${to}`}>
            {children}
        </a>
    ),
    Outlet: ({ context }) => (
        <div data-testid="outlet" data-context={JSON.stringify(context)}>
            Outlet Content
        </div>
    ),
    useLocation: () => mockLocation,
    useNavigate: () => jest.fn(),
    useParams: () => ({}),
    MemoryRouter: ({ children }) => <>{children}</>,
    BrowserRouter: ({ children }) => <>{children}</>
}));

// Mock PermissionsProvider
const mockPermissionsContext = {
    loading: false,
    activeLeague: null
};

jest.mock('../../../context/PermissionsProvider', () => ({
    usePermissions: () => mockPermissionsContext
}));

describe('LeaguesPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPermissionsContext.loading = false;
        mockPermissionsContext.activeLeague = null;
        mockLocation.pathname = '/leagues/current';
    });

    describe('Loading state', () => {
        it('should display loading message when loading is true', () => {
            mockPermissionsContext.loading = true;
            render(<LeaguesPage />);
            expect(screen.getByText('Loading...')).toBeInTheDocument();
        });

        it('should not display navigation tabs when loading', () => {
            mockPermissionsContext.loading = true;
            render(<LeaguesPage />);
            expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
        });
    });

    describe('User in league (inLeague = true)', () => {
        beforeEach(() => {
            mockPermissionsContext.activeLeague = {
                league_id: 1,
                name: 'Test League'
            };
        });

        it('should render the page title', () => {
            render(<LeaguesPage />);
            expect(screen.getByRole('heading', { name: /leagues/i })).toBeInTheDocument();
        });

        it('should render Current League tab', () => {
            render(<LeaguesPage />);
            expect(screen.getByText('Current League')).toBeInTheDocument();
        });

        it('should render Leaderboard tab', () => {
            render(<LeaguesPage />);
            expect(screen.getByText('Leaderboard')).toBeInTheDocument();
        });

        it('should render Budget tab', () => {
            render(<LeaguesPage />);
            expect(screen.getByText('Budget')).toBeInTheDocument();
        });

        it('should render Price Check tab', () => {
            render(<LeaguesPage />);
            expect(screen.getByText('Price Check')).toBeInTheDocument();
        });

        it('should render Metagame tab', () => {
            render(<LeaguesPage />);
            expect(screen.getByText('Metagame')).toBeInTheDocument();
        });

        it('should not render Sign Up tab when in league', () => {
            render(<LeaguesPage />);
            expect(screen.queryByText('Sign Up')).not.toBeInTheDocument();
        });

        it('should render navigation with tabs', () => {
            render(<LeaguesPage />);
            expect(screen.getByRole('navigation')).toBeInTheDocument();
        });

        it('should render Outlet component', () => {
            render(<LeaguesPage />);
            expect(screen.getByTestId('outlet')).toBeInTheDocument();
        });

        it('should pass activeLeague to Outlet context', () => {
            render(<LeaguesPage />);
            const outlet = screen.getByTestId('outlet');
            const context = JSON.parse(outlet.dataset.context);
            expect(context.activeLeague).toEqual({
                league_id: 1,
                name: 'Test League'
            });
        });

        it('should have correct link for Current League tab', () => {
            render(<LeaguesPage />);
            expect(screen.getByTestId('link-/leagues/current')).toBeInTheDocument();
        });

        it('should have correct link for Leaderboard tab', () => {
            render(<LeaguesPage />);
            expect(screen.getByTestId('link-/leagues/leaderboard')).toBeInTheDocument();
        });

        it('should have correct link for Budget tab', () => {
            render(<LeaguesPage />);
            expect(screen.getByTestId('link-/leagues/budget')).toBeInTheDocument();
        });

        it('should have correct link for Price Check tab', () => {
            render(<LeaguesPage />);
            expect(screen.getByTestId('link-/leagues/price-check')).toBeInTheDocument();
        });

        it('should have correct link for Metagame tab', () => {
            render(<LeaguesPage />);
            expect(screen.getByTestId('link-/leagues/metagame')).toBeInTheDocument();
        });
    });

    describe('User not in league (inLeague = false)', () => {
        beforeEach(() => {
            mockPermissionsContext.activeLeague = null;
            mockLocation.pathname = '/leagues/signup';
        });

        it('should render the page title', () => {
            render(<LeaguesPage />);
            expect(screen.getByRole('heading', { name: /leagues/i })).toBeInTheDocument();
        });

        it('should render Sign Up tab', () => {
            render(<LeaguesPage />);
            expect(screen.getByText('Sign Up')).toBeInTheDocument();
        });

        it('should not render Current League tab when not in league', () => {
            render(<LeaguesPage />);
            expect(screen.queryByText('Current League')).not.toBeInTheDocument();
        });

        it('should not render Leaderboard tab when not in league', () => {
            render(<LeaguesPage />);
            expect(screen.queryByText('Leaderboard')).not.toBeInTheDocument();
        });

        it('should not render Budget tab when not in league', () => {
            render(<LeaguesPage />);
            expect(screen.queryByText('Budget')).not.toBeInTheDocument();
        });

        it('should not render Price Check tab when not in league', () => {
            render(<LeaguesPage />);
            expect(screen.queryByText('Price Check')).not.toBeInTheDocument();
        });

        it('should not render Metagame tab when not in league', () => {
            render(<LeaguesPage />);
            expect(screen.queryByText('Metagame')).not.toBeInTheDocument();
        });

        it('should have correct link for Sign Up tab', () => {
            render(<LeaguesPage />);
            expect(screen.getByTestId('link-/leagues/signup')).toBeInTheDocument();
        });

        it('should render Outlet component', () => {
            render(<LeaguesPage />);
            expect(screen.getByTestId('outlet')).toBeInTheDocument();
        });

        it('should pass null activeLeague to Outlet context', () => {
            render(<LeaguesPage />);
            const outlet = screen.getByTestId('outlet');
            const context = JSON.parse(outlet.dataset.context);
            expect(context.activeLeague).toBeNull();
        });
    });

    describe('Active tab highlighting', () => {
        beforeEach(() => {
            mockPermissionsContext.activeLeague = { league_id: 1, name: 'Test League' };
        });

        it('should mark Current League as active when on /leagues/current', () => {
            mockLocation.pathname = '/leagues/current';
            render(<LeaguesPage />);
            const link = screen.getByTestId('link-/leagues/current');
            expect(link).toHaveClass('active');
        });

        it('should mark Leaderboard as active when on /leagues/leaderboard', () => {
            mockLocation.pathname = '/leagues/leaderboard';
            render(<LeaguesPage />);
            const link = screen.getByTestId('link-/leagues/leaderboard');
            expect(link).toHaveClass('active');
        });

        it('should mark Budget as active when on /leagues/budget', () => {
            mockLocation.pathname = '/leagues/budget';
            render(<LeaguesPage />);
            const link = screen.getByTestId('link-/leagues/budget');
            expect(link).toHaveClass('active');
        });

        it('should mark Price Check as active when on /leagues/price-check', () => {
            mockLocation.pathname = '/leagues/price-check';
            render(<LeaguesPage />);
            const link = screen.getByTestId('link-/leagues/price-check');
            expect(link).toHaveClass('active');
        });

        it('should mark Metagame as active when on /leagues/metagame', () => {
            mockLocation.pathname = '/leagues/metagame';
            render(<LeaguesPage />);
            const link = screen.getByTestId('link-/leagues/metagame');
            expect(link).toHaveClass('active');
        });

        it('should not mark tabs as active when on different path', () => {
            mockLocation.pathname = '/leagues/other';
            render(<LeaguesPage />);
            const link = screen.getByTestId('link-/leagues/current');
            expect(link).not.toHaveClass('active');
        });
    });

    describe('Sign Up tab highlighting', () => {
        beforeEach(() => {
            mockPermissionsContext.activeLeague = null;
        });

        it('should mark Sign Up as active when on /leagues/signup', () => {
            mockLocation.pathname = '/leagues/signup';
            render(<LeaguesPage />);
            const link = screen.getByTestId('link-/leagues/signup');
            expect(link).toHaveClass('active');
        });

        it('should not mark Sign Up as active when on different path', () => {
            mockLocation.pathname = '/leagues/other';
            render(<LeaguesPage />);
            const link = screen.getByTestId('link-/leagues/signup');
            expect(link).not.toHaveClass('active');
        });
    });

    describe('CSS classes', () => {
        it('should have container class on main div', () => {
            mockPermissionsContext.activeLeague = { league_id: 1 };
            const { container } = render(<LeaguesPage />);
            expect(container.firstChild).toHaveClass('container');
        });

        it('should have nav-tabs class on ul element', () => {
            mockPermissionsContext.activeLeague = { league_id: 1 };
            render(<LeaguesPage />);
            const ul = screen.getByRole('list');
            expect(ul).toHaveClass('nav', 'nav-tabs');
        });
    });
});
