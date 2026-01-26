import React from 'react';
import { render, screen } from '@testing-library/react';
import ActiveLeagueCard from '../ActiveLeagueCard';

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
    Link: ({ children, to }) => <a href={to}>{children}</a>,
    useNavigate: () => jest.fn(),
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

        it('should display weekly budget', () => {
            render(<ActiveLeagueCard league={mockLeague} />);
            expect(screen.getByText('$50')).toBeInTheDocument();
            expect(screen.getByText('Weekly Budget')).toBeInTheDocument();
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
            expect(screen.getByText('Jan 1')).toBeInTheDocument();
        });

        it('should display formatted end date', () => {
            render(<ActiveLeagueCard league={mockLeague} />);
            expect(screen.getByText('Mar 1')).toBeInTheDocument();
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
            expect(screen.getByText('$0')).toBeInTheDocument();
        });

        it('should handle league without weekly budget', () => {
            const leagueNoBudget = { ...mockLeague, weekly_budget: undefined };
            render(<ActiveLeagueCard league={leagueNoBudget} />);
            expect(screen.getByText('$0')).toBeInTheDocument();
        });
    });
});
