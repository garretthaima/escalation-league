import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LeagueInfoBanner from '../LeagueInfoBanner';

const renderLeagueInfoBanner = (props = {}) => {
    return render(
        <BrowserRouter>
            <LeagueInfoBanner {...props} />
        </BrowserRouter>
    );
};

describe('LeagueInfoBanner', () => {
    describe('without league', () => {
        it('should show no active league message', () => {
            renderLeagueInfoBanner({ league: null });
            expect(screen.getByText(/no active league/i)).toBeInTheDocument();
        });

        it('should show join a league link', () => {
            renderLeagueInfoBanner({ league: null });
            expect(screen.getByRole('link', { name: /join a league/i })).toBeInTheDocument();
        });
    });

    describe('with active league', () => {
        const mockLeague = {
            id: 1,
            name: 'Season 5',
            current_week: 3,
            end_date: '2026-03-01'
        };

        it('should render league name', () => {
            renderLeagueInfoBanner({ league: mockLeague });
            expect(screen.getByText('Season 5')).toBeInTheDocument();
        });

        it('should render current week badge', () => {
            renderLeagueInfoBanner({ league: mockLeague });
            expect(screen.getByText('Week 3')).toBeInTheDocument();
        });

        it('should render days remaining', () => {
            // Set up a future date
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 10);
            const league = {
                ...mockLeague,
                end_date: futureDate.toISOString()
            };

            renderLeagueInfoBanner({ league });
            expect(screen.getByText(/10 days remaining/i)).toBeInTheDocument();
        });

        it('should show singular "day" for 1 day remaining', () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const league = {
                ...mockLeague,
                end_date: tomorrow.toISOString()
            };

            renderLeagueInfoBanner({ league });
            expect(screen.getByText(/1 day remaining/i)).toBeInTheDocument();
        });

        it('should show "League ended" badge when end date has passed', () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 5);
            const league = {
                ...mockLeague,
                end_date: pastDate.toISOString()
            };

            renderLeagueInfoBanner({ league });
            expect(screen.getByText(/league ended/i)).toBeInTheDocument();
        });

        it('should render player count when provided', () => {
            renderLeagueInfoBanner({ league: mockLeague, playerCount: 12 });
            expect(screen.getByText(/12 players/i)).toBeInTheDocument();
        });

        it('should show singular "player" for 1 player', () => {
            renderLeagueInfoBanner({ league: mockLeague, playerCount: 1 });
            expect(screen.getByText(/1 player$/i)).toBeInTheDocument();
        });

        it('should render Full Dashboard link', () => {
            renderLeagueInfoBanner({ league: mockLeague });
            const link = screen.getByRole('link');
            expect(link).toHaveAttribute('href', '/leagues/dashboard');
        });
    });

    describe('styling', () => {
        it('should have league-info-banner class', () => {
            renderLeagueInfoBanner({
                league: { name: 'Test', current_week: 1, end_date: '2026-12-01' }
            });
            expect(document.querySelector('.league-info-banner')).toBeInTheDocument();
        });
    });
});
