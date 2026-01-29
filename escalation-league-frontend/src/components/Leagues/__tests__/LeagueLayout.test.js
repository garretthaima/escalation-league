import React from 'react';
import { render, screen } from '@testing-library/react';
import LeagueLayout from '../LeagueLayout';

// Mock react-router-dom
const mockLocation = { pathname: '/leagues/budget' };
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
    Outlet: () => <div data-testid="outlet">Outlet Content</div>,
    useLocation: () => mockLocation,
    useNavigate: () => jest.fn(),
    useParams: () => ({}),
    MemoryRouter: ({ children }) => <>{children}</>,
    BrowserRouter: ({ children }) => <>{children}</>
}));

describe('LeagueLayout', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockLocation.pathname = '/leagues/budget';
    });

    describe('Tool page rendering', () => {
        it('should render the Outlet component', () => {
            render(<LeagueLayout />);
            expect(screen.getByTestId('outlet')).toBeInTheDocument();
        });

        it('should render Back to Dashboard link on budget page', () => {
            mockLocation.pathname = '/leagues/budget';
            render(<LeagueLayout />);
            expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
        });

        it('should render Back to Dashboard link on price-check page', () => {
            mockLocation.pathname = '/leagues/price-check';
            render(<LeagueLayout />);
            expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
        });

        it('should render Back to Dashboard link on metagame page', () => {
            mockLocation.pathname = '/leagues/metagame';
            render(<LeagueLayout />);
            expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
        });

        it('should render navigation on tool pages', () => {
            mockLocation.pathname = '/leagues/budget';
            render(<LeagueLayout />);
            expect(screen.getByRole('navigation')).toBeInTheDocument();
        });

        it('should render Budget tab in navigation', () => {
            mockLocation.pathname = '/leagues/budget';
            render(<LeagueLayout />);
            expect(screen.getByText('Budget')).toBeInTheDocument();
        });

        it('should render Price Check tab in navigation', () => {
            mockLocation.pathname = '/leagues/budget';
            render(<LeagueLayout />);
            expect(screen.getByText('Price Check')).toBeInTheDocument();
        });

        it('should render Metagame tab in navigation', () => {
            mockLocation.pathname = '/leagues/budget';
            render(<LeagueLayout />);
            expect(screen.getByText('Metagame')).toBeInTheDocument();
        });
    });

    describe('Non-tool page rendering', () => {
        it('should not render Back to Dashboard link on non-tool page', () => {
            mockLocation.pathname = '/leagues/current';
            render(<LeagueLayout />);
            expect(screen.queryByText('Back to Dashboard')).not.toBeInTheDocument();
        });

        it('should not render navigation on non-tool page', () => {
            mockLocation.pathname = '/leagues/current';
            render(<LeagueLayout />);
            expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
        });

        it('should still render Outlet on non-tool page', () => {
            mockLocation.pathname = '/leagues/current';
            render(<LeagueLayout />);
            expect(screen.getByTestId('outlet')).toBeInTheDocument();
        });

        it('should not show tool navigation on leaderboard page', () => {
            mockLocation.pathname = '/leagues/leaderboard';
            render(<LeagueLayout />);
            expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
        });

        it('should not show tool navigation on signup page', () => {
            mockLocation.pathname = '/leagues/signup';
            render(<LeagueLayout />);
            expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
        });
    });

    describe('Navigation links', () => {
        beforeEach(() => {
            mockLocation.pathname = '/leagues/budget';
        });

        it('should have correct href for Back to Dashboard link', () => {
            render(<LeagueLayout />);
            expect(screen.getByTestId('link-/leagues')).toBeInTheDocument();
        });

        it('should have correct href for Budget link', () => {
            render(<LeagueLayout />);
            expect(screen.getByTestId('link-/leagues/budget')).toBeInTheDocument();
        });

        it('should have correct href for Price Check link', () => {
            render(<LeagueLayout />);
            expect(screen.getByTestId('link-/leagues/price-check')).toBeInTheDocument();
        });

        it('should have correct href for Metagame link', () => {
            render(<LeagueLayout />);
            expect(screen.getByTestId('link-/leagues/metagame')).toBeInTheDocument();
        });
    });

    describe('Active tab highlighting', () => {
        it('should mark Budget as active when on /leagues/budget', () => {
            mockLocation.pathname = '/leagues/budget';
            render(<LeagueLayout />);
            const link = screen.getByTestId('link-/leagues/budget');
            expect(link).toHaveClass('active');
        });

        it('should mark Price Check as active when on /leagues/price-check', () => {
            mockLocation.pathname = '/leagues/price-check';
            render(<LeagueLayout />);
            const link = screen.getByTestId('link-/leagues/price-check');
            expect(link).toHaveClass('active');
        });

        it('should mark Metagame as active when on /leagues/metagame', () => {
            mockLocation.pathname = '/leagues/metagame';
            render(<LeagueLayout />);
            const link = screen.getByTestId('link-/leagues/metagame');
            expect(link).toHaveClass('active');
        });

        it('should not mark Budget as active when on price-check page', () => {
            mockLocation.pathname = '/leagues/price-check';
            render(<LeagueLayout />);
            const link = screen.getByTestId('link-/leagues/budget');
            expect(link).not.toHaveClass('active');
        });

        it('should not mark Price Check as active when on budget page', () => {
            mockLocation.pathname = '/leagues/budget';
            render(<LeagueLayout />);
            const link = screen.getByTestId('link-/leagues/price-check');
            expect(link).not.toHaveClass('active');
        });

        it('should not mark Metagame as active when on budget page', () => {
            mockLocation.pathname = '/leagues/budget';
            render(<LeagueLayout />);
            const link = screen.getByTestId('link-/leagues/metagame');
            expect(link).not.toHaveClass('active');
        });
    });

    describe('Path matching for tool pages', () => {
        it('should recognize /leagues/budget as a tool page', () => {
            mockLocation.pathname = '/leagues/budget';
            render(<LeagueLayout />);
            expect(screen.getByRole('navigation')).toBeInTheDocument();
        });

        it('should recognize /leagues/budget/subpath as a tool page', () => {
            mockLocation.pathname = '/leagues/budget/subpath';
            render(<LeagueLayout />);
            expect(screen.getByRole('navigation')).toBeInTheDocument();
        });

        it('should recognize /leagues/price-check as a tool page', () => {
            mockLocation.pathname = '/leagues/price-check';
            render(<LeagueLayout />);
            expect(screen.getByRole('navigation')).toBeInTheDocument();
        });

        it('should recognize /leagues/price-check/subpath as a tool page', () => {
            mockLocation.pathname = '/leagues/price-check/subpath';
            render(<LeagueLayout />);
            expect(screen.getByRole('navigation')).toBeInTheDocument();
        });

        it('should recognize /leagues/metagame as a tool page', () => {
            mockLocation.pathname = '/leagues/metagame';
            render(<LeagueLayout />);
            expect(screen.getByRole('navigation')).toBeInTheDocument();
        });

        it('should recognize /leagues/metagame/subpath as a tool page', () => {
            mockLocation.pathname = '/leagues/metagame/subpath';
            render(<LeagueLayout />);
            expect(screen.getByRole('navigation')).toBeInTheDocument();
        });
    });

    describe('CSS classes', () => {
        it('should have container class on main div', () => {
            mockLocation.pathname = '/leagues/budget';
            const { container } = render(<LeagueLayout />);
            expect(container.firstChild).toHaveClass('container');
        });

        it('should have nav-pills class on ul element', () => {
            mockLocation.pathname = '/leagues/budget';
            render(<LeagueLayout />);
            const ul = screen.getByRole('list');
            expect(ul).toHaveClass('nav', 'nav-pills', 'nav-fill');
        });

        it('should have btn-link class on Back to Dashboard link', () => {
            mockLocation.pathname = '/leagues/budget';
            render(<LeagueLayout />);
            const backLink = screen.getByTestId('link-/leagues');
            expect(backLink).toHaveClass('btn', 'btn-link');
        });
    });
});
