import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import GamesPage from '../GamesPage';

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
    Link: ({ children, to }) => <a href={to}>{children}</a>,
    NavLink: ({ children, to }) => <a href={to}>{children}</a>,
    useNavigate: () => jest.fn(),
    useLocation: () => ({ pathname: '/pods', search: '', state: null }),
    useParams: () => ({}),
    useSearchParams: () => [new URLSearchParams(), jest.fn()],
    MemoryRouter: ({ children }) => <>{children}</>,
    BrowserRouter: ({ children }) => <>{children}</>,
    Routes: ({ children }) => <>{children}</>,
    Route: () => null,
    Navigate: () => null,
    Outlet: () => <div data-testid="outlet">Outlet Content</div>,
}));

// Mock child components to isolate GamesPage testing
jest.mock('../ActiveGamesPage', () => () => <div data-testid="active-games">Active Games Content</div>);
jest.mock('../CompletedGamesPage', () => () => <div data-testid="completed-games">Completed Games Content</div>);
jest.mock('../ConfirmGamesPage', () => () => <div data-testid="confirm-games">Confirm Games Content</div>);

// Mock permissions context
const mockPermissionsContext = {
    permissions: [{ name: 'pod_read' }],
    loading: false,
    darkMode: false
};

jest.mock('../../../context/PermissionsProvider', () => ({
    usePermissions: () => mockPermissionsContext
}));

describe('GamesPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        // Reset mock context to default values
        mockPermissionsContext.permissions = [{ name: 'pod_read' }];
        mockPermissionsContext.loading = false;
        mockPermissionsContext.darkMode = false;
    });

    describe('loading state', () => {
        it('should render loading indicator when loading is true', () => {
            mockPermissionsContext.loading = true;
            render(<GamesPage />);
            expect(screen.getByText('Loading...')).toBeInTheDocument();
        });
    });

    describe('permission checks', () => {
        it('should render permission denied message when user lacks pod_read permission', () => {
            mockPermissionsContext.permissions = [];
            render(<GamesPage />);
            expect(screen.getByText('You do not have permission to view this page.')).toBeInTheDocument();
        });

        it('should render page content when user has pod_read permission', () => {
            render(<GamesPage />);
            expect(screen.getByText('Pods')).toBeInTheDocument();
        });
    });

    describe('rendering sections', () => {
        it('should render the Pods heading', () => {
            render(<GamesPage />);
            expect(screen.getByRole('heading', { name: 'Pods', level: 1 })).toBeInTheDocument();
        });

        it('should render all three collapsible sections', () => {
            render(<GamesPage />);
            expect(screen.getByText('Active Pods')).toBeInTheDocument();
            expect(screen.getByText('Confirm Pods')).toBeInTheDocument();
            expect(screen.getByText('Completed Pods')).toBeInTheDocument();
        });

        it('should render child components', () => {
            render(<GamesPage />);
            expect(screen.getByTestId('active-games')).toBeInTheDocument();
            expect(screen.getByTestId('confirm-games')).toBeInTheDocument();
            expect(screen.getByTestId('completed-games')).toBeInTheDocument();
        });

        it('should render the Outlet for child routes', () => {
            render(<GamesPage />);
            expect(screen.getByTestId('outlet')).toBeInTheDocument();
        });
    });

    describe('collapsible sections', () => {
        it('should toggle Active Pods section when header is clicked', () => {
            render(<GamesPage />);
            const header = screen.getByText('Active Pods');
            const section = screen.getByTestId('active-games').parentElement;

            // Initially expanded
            expect(section).toHaveClass('expanded');

            // Click to collapse
            fireEvent.click(header);
            expect(section).not.toHaveClass('expanded');

            // Click to expand again
            fireEvent.click(header);
            expect(section).toHaveClass('expanded');
        });

        it('should toggle Confirm Pods section when header is clicked', () => {
            render(<GamesPage />);
            const header = screen.getByText('Confirm Pods');
            const section = screen.getByTestId('confirm-games').parentElement;

            // Initially expanded
            expect(section).toHaveClass('expanded');

            // Click to collapse
            fireEvent.click(header);
            expect(section).not.toHaveClass('expanded');
        });

        it('should toggle Completed Pods section when header is clicked', () => {
            render(<GamesPage />);
            const header = screen.getByText('Completed Pods');
            const section = screen.getByTestId('completed-games').parentElement;

            // Initially expanded
            expect(section).toHaveClass('expanded');

            // Click to collapse
            fireEvent.click(header);
            expect(section).not.toHaveClass('expanded');
        });

        it('should display correct chevron icon based on section state', () => {
            const { container } = render(<GamesPage />);

            // Get the Active Pods header and its icon
            const activeHeader = screen.getByText('Active Pods');
            let icon = activeHeader.querySelector('i');

            // Initially showing down chevron (expanded)
            expect(icon).toHaveClass('fa-chevron-down');

            // Click to collapse
            fireEvent.click(activeHeader);
            icon = activeHeader.querySelector('i');
            expect(icon).toHaveClass('fa-chevron-up');
        });
    });

    describe('localStorage persistence', () => {
        it('should save collapsible state to localStorage', () => {
            render(<GamesPage />);

            // Click to collapse Active Pods
            fireEvent.click(screen.getByText('Active Pods'));

            const savedState = JSON.parse(localStorage.getItem('collapsibleState'));
            expect(savedState.showActive).toBe(false);
            expect(savedState.showConfirm).toBe(true);
            expect(savedState.showCompleted).toBe(true);
        });

        it('should load collapsible state from localStorage', () => {
            // Set up localStorage with collapsed states
            localStorage.setItem('collapsibleState', JSON.stringify({
                showActive: false,
                showConfirm: false,
                showCompleted: true
            }));

            render(<GamesPage />);

            // Check that sections respect the stored state
            const activeSection = screen.getByTestId('active-games').parentElement;
            const confirmSection = screen.getByTestId('confirm-games').parentElement;
            const completedSection = screen.getByTestId('completed-games').parentElement;

            expect(activeSection).not.toHaveClass('expanded');
            expect(confirmSection).not.toHaveClass('expanded');
            expect(completedSection).toHaveClass('expanded');
        });

        it('should use default expanded state when localStorage is empty', () => {
            render(<GamesPage />);

            const activeSection = screen.getByTestId('active-games').parentElement;
            const confirmSection = screen.getByTestId('confirm-games').parentElement;
            const completedSection = screen.getByTestId('completed-games').parentElement;

            expect(activeSection).toHaveClass('expanded');
            expect(confirmSection).toHaveClass('expanded');
            expect(completedSection).toHaveClass('expanded');
        });
    });

    describe('dark mode styling', () => {
        it('should apply dark-mode class to headers when darkMode is true', () => {
            mockPermissionsContext.darkMode = true;
            render(<GamesPage />);

            const activeHeader = screen.getByText('Active Pods');
            expect(activeHeader).toHaveClass('dark-mode');
        });

        it('should not apply dark-mode class to headers when darkMode is false', () => {
            mockPermissionsContext.darkMode = false;
            render(<GamesPage />);

            const activeHeader = screen.getByText('Active Pods');
            expect(activeHeader).not.toHaveClass('dark-mode');
        });

        it('should apply dark-mode class to collapsible content when darkMode is true', () => {
            mockPermissionsContext.darkMode = true;
            render(<GamesPage />);

            const section = screen.getByTestId('active-games').parentElement;
            expect(section).toHaveClass('dark-mode');
        });
    });

    describe('route-based rendering', () => {
        it('should render sections only on base /pods route', () => {
            render(<GamesPage />);

            expect(screen.getByText('Active Pods')).toBeInTheDocument();
            expect(screen.getByText('Confirm Pods')).toBeInTheDocument();
            expect(screen.getByText('Completed Pods')).toBeInTheDocument();
        });
    });
});

