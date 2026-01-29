import React from 'react';
import { render, screen } from '@testing-library/react';
import ActiveLeagueCard from '../ActiveLeagueCard';

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
    Link: ({ children, to }) => <a href={to}>{children}</a>,
    useNavigate: () => jest.fn(),
}));

// Mock the dateFormatter to return predictable values
jest.mock('../../../utils/dateFormatter', () => ({
    formatDate: (date, options = {}) => {
        const d = new Date(date);
        if (options.year === undefined) {
            // Return short format without year
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    },
    formatDateTime: (date) => new Date(date).toLocaleString('en-US'),
    parseDate: (dateString) => {
        if (dateString instanceof Date) return dateString;
        if (!dateString) return new Date(NaN);
        // Handle YYYY-MM-DD format as local date
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            const [year, month, day] = dateString.split('-').map(Number);
            return new Date(year, month - 1, day);
        }
        return new Date(dateString);
    },
    initTimezone: jest.fn().mockResolvedValue('America/Chicago'),
    setTimezoneLoader: jest.fn(),
    getTimezone: () => 'America/Chicago',
}));

// Mock budgetCalculations
jest.mock('../../../utils/budgetCalculations', () => ({
    calculateTotalSeasonBudget: (weeks, weeklyBudget) => (weeks || 0) * (weeklyBudget || 0),
    calculateWeeksFromDates: () => 8, // Mock 8 weeks
}));

describe('ActiveLeagueCard', () => {
    const mockLeague = {
        id: 1,
        name: 'Season 5',
        description: 'Escalation League Season 5',
        current_week: 3,
        start_date: '2025-01-01',
        end_date: '2025-03-01',
        weekly_budget: 50
    };

    describe('no league state', () => {
        it('should show no active league message when league is null', () => {
            render(<ActiveLeagueCard league={null} />);
            expect(screen.getByText('No active league')).toBeInTheDocument();
        });

        it('should show trophy icon in empty state', () => {
            const { container } = render(<ActiveLeagueCard league={null} />);
            expect(container.querySelector('.fa-trophy')).toBeInTheDocument();
        });

        it('should have active-league-card class in empty state', () => {
            const { container } = render(<ActiveLeagueCard league={null} />);
            expect(container.querySelector('.active-league-card')).toBeInTheDocument();
        });
    });

    describe('with league data', () => {
        it('should display league name', () => {
            render(<ActiveLeagueCard league={mockLeague} />);
            expect(screen.getByText('Season 5')).toBeInTheDocument();
        });

        it('should display league description', () => {
            render(<ActiveLeagueCard league={mockLeague} />);
            expect(screen.getByText('Escalation League Season 5')).toBeInTheDocument();
        });

        it('should display current week badge', () => {
            render(<ActiveLeagueCard league={mockLeague} />);
            expect(screen.getByText('Week 3')).toBeInTheDocument();
        });

        it('should display season budget', () => {
            render(<ActiveLeagueCard league={mockLeague} />);
            // 8 weeks * $50 = $400.00
            expect(screen.getByText('$400.00')).toBeInTheDocument();
            expect(screen.getByText('Season Budget')).toBeInTheDocument();
        });

        it('should display player count when provided', () => {
            render(<ActiveLeagueCard league={mockLeague} playerCount={12} />);
            expect(screen.getByText('12')).toBeInTheDocument();
            expect(screen.getByText('Players')).toBeInTheDocument();
        });

        it('should show question mark when player count not provided', () => {
            render(<ActiveLeagueCard league={mockLeague} />);
            expect(screen.getByText('?')).toBeInTheDocument();
        });

        it('should render View League link', () => {
            render(<ActiveLeagueCard league={mockLeague} />);
            const link = screen.getByRole('link', { name: /view league/i });
            expect(link).toBeInTheDocument();
            expect(link).toHaveAttribute('href', '/leagues');
        });
    });

    describe('progress bar', () => {
        it('should render progress bar', () => {
            const { container } = render(<ActiveLeagueCard league={mockLeague} />);
            expect(container.querySelector('.progress')).toBeInTheDocument();
            expect(container.querySelector('.progress-bar')).toBeInTheDocument();
        });

        it('should have progressbar role', () => {
            render(<ActiveLeagueCard league={mockLeague} />);
            expect(screen.getByRole('progressbar')).toBeInTheDocument();
        });
    });

    describe('date formatting', () => {
        it('should display formatted start date', () => {
            render(<ActiveLeagueCard league={mockLeague} />);
            // The mock returns the date formatted by browser locale
            expect(screen.getByText(/Jan|Dec/)).toBeInTheDocument();
        });

        it('should display formatted end date', () => {
            render(<ActiveLeagueCard league={mockLeague} />);
            expect(screen.getByText(/Mar|Feb/)).toBeInTheDocument();
        });
    });

    describe('days remaining', () => {
        it('should display Days Left label', () => {
            render(<ActiveLeagueCard league={mockLeague} />);
            expect(screen.getByText('Days Left')).toBeInTheDocument();
        });
    });

    describe('styling', () => {
        it('should have active-league-card class', () => {
            const { container } = render(<ActiveLeagueCard league={mockLeague} />);
            expect(container.querySelector('.active-league-card')).toBeInTheDocument();
        });

        it('should have h-100 class for full height', () => {
            const { container } = render(<ActiveLeagueCard league={mockLeague} />);
            expect(container.querySelector('.h-100')).toBeInTheDocument();
        });

        it('should have trophy icon in header', () => {
            const { container } = render(<ActiveLeagueCard league={mockLeague} />);
            expect(container.querySelector('.fa-trophy')).toBeInTheDocument();
        });
    });

    describe('edge cases', () => {
        it('should handle league with zero weekly budget', () => {
            const leagueWithZeroBudget = { ...mockLeague, weekly_budget: 0 };
            render(<ActiveLeagueCard league={leagueWithZeroBudget} />);
            // 8 weeks * $0 = $0.00
            expect(screen.getByText('$0.00')).toBeInTheDocument();
        });

        it('should handle league without weekly budget', () => {
            const leagueNoBudget = { ...mockLeague, weekly_budget: undefined };
            render(<ActiveLeagueCard league={leagueNoBudget} />);
            // undefined budget = $0.00
            expect(screen.getByText('$0.00')).toBeInTheDocument();
        });
    });
});
