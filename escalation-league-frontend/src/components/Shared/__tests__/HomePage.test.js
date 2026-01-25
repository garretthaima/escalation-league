import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import HomePage from '../HomePage';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    Link: ({ children, to }) => <a href={to}>{children}</a>,
    NavLink: ({ children, to }) => <a href={to}>{children}</a>,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/', search: '', state: null }),
    useParams: () => ({}),
    useSearchParams: () => [new URLSearchParams(), jest.fn()],
    MemoryRouter: ({ children }) => <>{children}</>,
    BrowserRouter: ({ children }) => <>{children}</>,
    Routes: ({ children }) => <>{children}</>,
    Route: () => null,
    Navigate: () => null,
    Outlet: () => null,
}));

describe('HomePage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('hero section rendering', () => {
        it('should render the hero section', () => {
            const { container } = render(<HomePage />);
            expect(container.querySelector('.hero-section')).toBeInTheDocument();
        });

        it('should render the hero background', () => {
            const { container } = render(<HomePage />);
            expect(container.querySelector('.hero-background')).toBeInTheDocument();
        });

        it('should render the hero content', () => {
            const { container } = render(<HomePage />);
            expect(container.querySelector('.hero-content')).toBeInTheDocument();
        });

        it('should render the welcome heading', () => {
            render(<HomePage />);
            expect(screen.getByRole('heading', { name: 'Welcome to Escalation League' })).toBeInTheDocument();
        });

        it('should render the tagline text', () => {
            render(<HomePage />);
            expect(screen.getByText('Compete, track your progress, and climb the leaderboard!')).toBeInTheDocument();
        });

        it('should render the Join a League button in hero section', () => {
            render(<HomePage />);
            const buttons = screen.getAllByRole('button', { name: 'Join a League' });
            expect(buttons.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('quick links section', () => {
        it('should render the quick links section', () => {
            const { container } = render(<HomePage />);
            expect(container.querySelector('.quick-links')).toBeInTheDocument();
        });

        it('should render three homepage cards', () => {
            const { container } = render(<HomePage />);
            const cards = container.querySelectorAll('.homepage-card');
            expect(cards).toHaveLength(3);
        });

        it('should render Join a League card', () => {
            render(<HomePage />);
            expect(screen.getByRole('heading', { name: 'Join a League' })).toBeInTheDocument();
            expect(screen.getByText('Find and join an active league to start competing.')).toBeInTheDocument();
        });

        it('should render View Active Pods card', () => {
            render(<HomePage />);
            expect(screen.getByRole('heading', { name: 'View Active Pods' })).toBeInTheDocument();
            expect(screen.getByText('See the current games and their participants.')).toBeInTheDocument();
        });

        it('should render Leaderboard card', () => {
            render(<HomePage />);
            expect(screen.getByRole('heading', { name: 'Leaderboard' })).toBeInTheDocument();
            expect(screen.getByText('Track your progress and see how you rank.')).toBeInTheDocument();
        });
    });

    describe('navigation - hero button', () => {
        it('should navigate to /leagues when hero button is clicked', () => {
            render(<HomePage />);
            const heroButton = screen.getByRole('button', { name: 'Join a League' });
            fireEvent.click(heroButton);
            expect(mockNavigate).toHaveBeenCalledWith('/leagues');
        });
    });

    describe('navigation - quick link cards', () => {
        it('should navigate to /leagues when Join a League card is clicked', () => {
            const { container } = render(<HomePage />);
            const cards = container.querySelectorAll('.homepage-card');
            fireEvent.click(cards[0]); // First card is Join a League
            expect(mockNavigate).toHaveBeenCalledWith('/leagues');
        });

        it('should navigate to /pods/active when View Active Pods card is clicked', () => {
            const { container } = render(<HomePage />);
            const cards = container.querySelectorAll('.homepage-card');
            fireEvent.click(cards[1]); // Second card is View Active Pods
            expect(mockNavigate).toHaveBeenCalledWith('/pods/active');
        });

        it('should navigate to /leagues/leaderboard when Leaderboard card is clicked', () => {
            const { container } = render(<HomePage />);
            const cards = container.querySelectorAll('.homepage-card');
            fireEvent.click(cards[2]); // Third card is Leaderboard
            expect(mockNavigate).toHaveBeenCalledWith('/leagues/leaderboard');
        });
    });

    describe('styling', () => {
        it('should have btn-primary class on hero button', () => {
            render(<HomePage />);
            const heroButton = screen.getByRole('button', { name: 'Join a League' });
            expect(heroButton).toHaveClass('btn', 'btn-primary');
        });
    });

    describe('structure', () => {
        it('should render correct number of headings', () => {
            render(<HomePage />);
            const headings = screen.getAllByRole('heading');
            // 1 h1 (Welcome) + 3 h3 (card titles)
            expect(headings).toHaveLength(4);
        });

        it('should have h1 for main welcome heading', () => {
            render(<HomePage />);
            const mainHeading = screen.getByRole('heading', { level: 1 });
            expect(mainHeading).toHaveTextContent('Welcome to Escalation League');
        });

        it('should have h3 for card headings', () => {
            render(<HomePage />);
            const h3Headings = screen.getAllByRole('heading', { level: 3 });
            expect(h3Headings).toHaveLength(3);
        });
    });
});
