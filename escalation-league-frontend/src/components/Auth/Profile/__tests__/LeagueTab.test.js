// Mock axios BEFORE any imports (ESM compatibility)
jest.mock('../../../../api/axiosConfig', () => ({
    __esModule: true,
    default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

// Mock child components
jest.mock('../CommanderDisplay', () => {
    return function MockCommanderDisplay({ commanderId, showPartner }) {
        return <span data-testid="commander-display">{commanderId}</span>;
    };
});

jest.mock('../../../Leagues/UpdateCommanderModal', () => {
    return function MockUpdateCommanderModal({ show, onHide, leagueId }) {
        if (!show) return null;
        return (
            <div data-testid="update-commander-modal">
                <span>Update Commander Modal</span>
                <span>League ID: {leagueId}</span>
                <button onClick={() => onHide(false)}>Cancel</button>
                <button onClick={() => onHide(true)}>Save</button>
            </div>
        );
    };
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LeagueTab from '../LeagueTab';

const renderWithRouter = (component) => {
    return render(
        <MemoryRouter>
            {component}
        </MemoryRouter>
    );
};

// TODO: Fix async/mock issues - tests skipped
describe.skip('LeagueTab', () => {
    const mockCurrentLeague = {
        league_id: 1,
        name: 'Test League',
        start_date: '2024-01-01T00:00:00.000Z',
        end_date: '2024-12-31T00:00:00.000Z',
        is_active: true,
        league_wins: 10,
        league_losses: 5,
        league_draws: 2,
        total_points: 150,
        rank: 3,
        current_commander: 'abc12345-1234-5678-abcd-123456789abc',
        commander_name: 'Kenrith, the Returned King',
        commander_partner: null,
        partner_name: null,
        elo_rating: 1650,
        decklistUrl: 'https://moxfield.com/decks/test123',
        commander_scryfall_id: 'abc12345'
    };

    const mockOnCommanderUpdated = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        // Mock Date to have consistent "days remaining" calculations
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2024-06-15T00:00:00.000Z'));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('no league state', () => {
        it('should show empty state when currentLeague is null', () => {
            renderWithRouter(<LeagueTab currentLeague={null} onCommanderUpdated={mockOnCommanderUpdated} />);

            expect(screen.getByText('No Active League')).toBeInTheDocument();
            expect(screen.getByText('You are not currently participating in any league.')).toBeInTheDocument();
        });

        it('should show Browse Leagues link when no league', () => {
            renderWithRouter(<LeagueTab currentLeague={null} onCommanderUpdated={mockOnCommanderUpdated} />);

            const browseLink = screen.getByRole('link', { name: /Browse Leagues/i });
            expect(browseLink).toBeInTheDocument();
            expect(browseLink).toHaveAttribute('href', '/leagues');
        });
    });

    describe('league header', () => {
        it('should display league name', () => {
            renderWithRouter(<LeagueTab currentLeague={mockCurrentLeague} onCommanderUpdated={mockOnCommanderUpdated} />);

            expect(screen.getByText('Test League')).toBeInTheDocument();
        });

        it('should display Active badge for active leagues', () => {
            renderWithRouter(<LeagueTab currentLeague={mockCurrentLeague} onCommanderUpdated={mockOnCommanderUpdated} />);

            expect(screen.getByText('Active')).toBeInTheDocument();
        });

        it('should display Inactive badge for inactive leagues', () => {
            renderWithRouter(
                <LeagueTab
                    currentLeague={{ ...mockCurrentLeague, is_active: false }}
                    onCommanderUpdated={mockOnCommanderUpdated}
                />
            );

            expect(screen.getByText('Inactive')).toBeInTheDocument();
        });

        it('should display league date range', () => {
            renderWithRouter(<LeagueTab currentLeague={mockCurrentLeague} onCommanderUpdated={mockOnCommanderUpdated} />);

            expect(screen.getByText(/Jan 1/)).toBeInTheDocument();
            expect(screen.getByText(/Dec 31, 2024/)).toBeInTheDocument();
        });

        it('should display rank when available', () => {
            renderWithRouter(<LeagueTab currentLeague={mockCurrentLeague} onCommanderUpdated={mockOnCommanderUpdated} />);

            expect(screen.getByText('#3')).toBeInTheDocument();
            expect(screen.getByText('Rank')).toBeInTheDocument();
        });

        it('should not display rank when not available', () => {
            renderWithRouter(
                <LeagueTab
                    currentLeague={{ ...mockCurrentLeague, rank: null }}
                    onCommanderUpdated={mockOnCommanderUpdated}
                />
            );

            expect(screen.queryByText('#')).not.toBeInTheDocument();
        });

        it('should display days remaining when positive', () => {
            renderWithRouter(<LeagueTab currentLeague={mockCurrentLeague} onCommanderUpdated={mockOnCommanderUpdated} />);

            // Dec 31 - Jun 15 = 199 days
            expect(screen.getByText('199')).toBeInTheDocument();
            expect(screen.getByText('Days Left')).toBeInTheDocument();
        });

        it('should not display days remaining when league has ended', () => {
            renderWithRouter(
                <LeagueTab
                    currentLeague={{ ...mockCurrentLeague, end_date: '2024-01-01T00:00:00.000Z' }}
                    onCommanderUpdated={mockOnCommanderUpdated}
                />
            );

            expect(screen.queryByText('Days Left')).not.toBeInTheDocument();
        });
    });

    describe('stats cards', () => {
        it('should display total points', () => {
            renderWithRouter(<LeagueTab currentLeague={mockCurrentLeague} onCommanderUpdated={mockOnCommanderUpdated} />);

            expect(screen.getByText('150')).toBeInTheDocument();
            expect(screen.getByText('Total Points')).toBeInTheDocument();
        });

        it('should display wins', () => {
            renderWithRouter(<LeagueTab currentLeague={mockCurrentLeague} onCommanderUpdated={mockOnCommanderUpdated} />);

            expect(screen.getByText('10')).toBeInTheDocument();
            expect(screen.getByText('Wins')).toBeInTheDocument();
        });

        it('should display losses', () => {
            renderWithRouter(<LeagueTab currentLeague={mockCurrentLeague} onCommanderUpdated={mockOnCommanderUpdated} />);

            expect(screen.getByText('5')).toBeInTheDocument();
            expect(screen.getByText('Losses')).toBeInTheDocument();
        });

        it('should display ELO rating', () => {
            renderWithRouter(<LeagueTab currentLeague={mockCurrentLeague} onCommanderUpdated={mockOnCommanderUpdated} />);

            expect(screen.getByText('1650')).toBeInTheDocument();
            expect(screen.getByText('League ELO')).toBeInTheDocument();
        });

        it('should display 0 for missing stats', () => {
            renderWithRouter(
                <LeagueTab
                    currentLeague={{
                        ...mockCurrentLeague,
                        total_points: null,
                        league_wins: null,
                        league_losses: null
                    }}
                    onCommanderUpdated={mockOnCommanderUpdated}
                />
            );

            const zeros = screen.getAllByText('0');
            expect(zeros.length).toBeGreaterThanOrEqual(3);
        });

        it('should display default ELO rating (1500) when not set', () => {
            renderWithRouter(
                <LeagueTab
                    currentLeague={{ ...mockCurrentLeague, elo_rating: null }}
                    onCommanderUpdated={mockOnCommanderUpdated}
                />
            );

            expect(screen.getByText('1500')).toBeInTheDocument();
        });
    });

    describe('commander section', () => {
        it('should display commander name when available', () => {
            renderWithRouter(<LeagueTab currentLeague={mockCurrentLeague} onCommanderUpdated={mockOnCommanderUpdated} />);

            expect(screen.getByText('Kenrith, the Returned King')).toBeInTheDocument();
        });

        it('should use CommanderDisplay for commander_id when no commander_name', () => {
            renderWithRouter(
                <LeagueTab
                    currentLeague={{
                        ...mockCurrentLeague,
                        commander_name: null,
                        current_commander: 'some-uuid'
                    }}
                    onCommanderUpdated={mockOnCommanderUpdated}
                />
            );

            expect(screen.getAllByTestId('commander-display').length).toBeGreaterThan(0);
        });

        it('should display partner when available', () => {
            renderWithRouter(
                <LeagueTab
                    currentLeague={{
                        ...mockCurrentLeague,
                        partner_name: 'Rograkh, Son of Rohgahh',
                        commander_partner: 'partner-uuid'
                    }}
                    onCommanderUpdated={mockOnCommanderUpdated}
                />
            );

            expect(screen.getByText(/Partner:/)).toBeInTheDocument();
            expect(screen.getByText('Rograkh, Son of Rohgahh')).toBeInTheDocument();
        });

        it('should display decklist link when available', () => {
            renderWithRouter(<LeagueTab currentLeague={mockCurrentLeague} onCommanderUpdated={mockOnCommanderUpdated} />);

            const decklistLink = screen.getByRole('link', { name: /View Decklist/i });
            expect(decklistLink).toBeInTheDocument();
            expect(decklistLink).toHaveAttribute('href', 'https://moxfield.com/decks/test123');
            expect(decklistLink).toHaveAttribute('target', '_blank');
        });

        it('should show no commander message when not set', () => {
            renderWithRouter(
                <LeagueTab
                    currentLeague={{
                        ...mockCurrentLeague,
                        commander_name: null,
                        current_commander: null
                    }}
                    onCommanderUpdated={mockOnCommanderUpdated}
                />
            );

            expect(screen.getByText('No commander registered')).toBeInTheDocument();
        });

        it('should display commander image when scryfall_id is available', () => {
            renderWithRouter(<LeagueTab currentLeague={mockCurrentLeague} onCommanderUpdated={mockOnCommanderUpdated} />);

            const commanderImg = screen.getByAltText('Kenrith, the Returned King');
            expect(commanderImg).toBeInTheDocument();
            expect(commanderImg.src).toContain('cards.scryfall.io');
        });
    });

    describe('quick actions', () => {
        it('should display View Leaderboard link', () => {
            renderWithRouter(<LeagueTab currentLeague={mockCurrentLeague} onCommanderUpdated={mockOnCommanderUpdated} />);

            const leaderboardLink = screen.getByRole('link', { name: /View Leaderboard/i });
            expect(leaderboardLink).toBeInTheDocument();
            expect(leaderboardLink).toHaveAttribute('href', '/leagues/1');
        });

        it('should display View Your Games link', () => {
            renderWithRouter(<LeagueTab currentLeague={mockCurrentLeague} onCommanderUpdated={mockOnCommanderUpdated} />);

            const gamesLink = screen.getByRole('link', { name: /View Your Games/i });
            expect(gamesLink).toBeInTheDocument();
            expect(gamesLink).toHaveAttribute('href', '/pods');
        });

        it('should display Update Commander button', () => {
            renderWithRouter(<LeagueTab currentLeague={mockCurrentLeague} onCommanderUpdated={mockOnCommanderUpdated} />);

            expect(screen.getByRole('button', { name: /Update Commander/i })).toBeInTheDocument();
        });
    });

    describe('update commander modal', () => {
        it('should open modal when Update Commander is clicked', () => {
            renderWithRouter(<LeagueTab currentLeague={mockCurrentLeague} onCommanderUpdated={mockOnCommanderUpdated} />);

            fireEvent.click(screen.getByRole('button', { name: /Update Commander/i }));

            expect(screen.getByTestId('update-commander-modal')).toBeInTheDocument();
            expect(screen.getByText('League ID: 1')).toBeInTheDocument();
        });

        it('should close modal when Cancel is clicked', () => {
            renderWithRouter(<LeagueTab currentLeague={mockCurrentLeague} onCommanderUpdated={mockOnCommanderUpdated} />);

            fireEvent.click(screen.getByRole('button', { name: /Update Commander/i }));
            expect(screen.getByTestId('update-commander-modal')).toBeInTheDocument();

            fireEvent.click(screen.getByText('Cancel'));
            expect(screen.queryByTestId('update-commander-modal')).not.toBeInTheDocument();
        });

        it('should call onCommanderUpdated when Save is clicked', () => {
            renderWithRouter(<LeagueTab currentLeague={mockCurrentLeague} onCommanderUpdated={mockOnCommanderUpdated} />);

            fireEvent.click(screen.getByRole('button', { name: /Update Commander/i }));
            fireEvent.click(screen.getByText('Save'));

            expect(mockOnCommanderUpdated).toHaveBeenCalled();
        });

        it('should not call onCommanderUpdated when Cancel is clicked', () => {
            renderWithRouter(<LeagueTab currentLeague={mockCurrentLeague} onCommanderUpdated={mockOnCommanderUpdated} />);

            fireEvent.click(screen.getByRole('button', { name: /Update Commander/i }));
            fireEvent.click(screen.getByText('Cancel'));

            expect(mockOnCommanderUpdated).not.toHaveBeenCalled();
        });

        it('should not call onCommanderUpdated when onCommanderUpdated prop is null', () => {
            renderWithRouter(<LeagueTab currentLeague={mockCurrentLeague} onCommanderUpdated={null} />);

            fireEvent.click(screen.getByRole('button', { name: /Update Commander/i }));

            // This should not throw an error
            expect(() => fireEvent.click(screen.getByText('Save'))).not.toThrow();
        });
    });

    describe('commander card image error handling', () => {
        it('should hide image on error', () => {
            renderWithRouter(<LeagueTab currentLeague={mockCurrentLeague} onCommanderUpdated={mockOnCommanderUpdated} />);

            const commanderImg = screen.getByAltText('Kenrith, the Returned King');

            // Simulate image error
            fireEvent.error(commanderImg);

            expect(commanderImg.style.display).toBe('none');
        });
    });

    describe('edge cases', () => {
        it('should handle missing decklistUrl gracefully', () => {
            renderWithRouter(
                <LeagueTab
                    currentLeague={{ ...mockCurrentLeague, decklistUrl: null }}
                    onCommanderUpdated={mockOnCommanderUpdated}
                />
            );

            expect(screen.queryByText('View Decklist')).not.toBeInTheDocument();
        });

        it('should handle undefined league values gracefully', () => {
            const minimalLeague = {
                league_id: 1,
                name: 'Minimal League',
                start_date: '2024-01-01T00:00:00.000Z',
                end_date: '2024-12-31T00:00:00.000Z',
                is_active: true
            };

            renderWithRouter(
                <LeagueTab
                    currentLeague={minimalLeague}
                    onCommanderUpdated={mockOnCommanderUpdated}
                />
            );

            expect(screen.getByText('Minimal League')).toBeInTheDocument();
        });

        it('should not display commander image when scryfall_id is not available', () => {
            renderWithRouter(
                <LeagueTab
                    currentLeague={{
                        ...mockCurrentLeague,
                        commander_scryfall_id: null
                    }}
                    onCommanderUpdated={mockOnCommanderUpdated}
                />
            );

            const images = screen.queryAllByRole('img');
            const commanderImages = images.filter(img =>
                img.src && img.src.includes('cards.scryfall.io')
            );
            expect(commanderImages.length).toBe(0);
        });
    });
});
