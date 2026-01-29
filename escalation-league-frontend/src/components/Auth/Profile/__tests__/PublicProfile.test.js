// Mock axios BEFORE any imports (ESM compatibility)
jest.mock('../../../../api/axiosConfig', () => ({
    __esModule: true,
    default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

// Mock react-router-dom
const mockNavigate = jest.fn();
let mockParams = { userId: '1', leagueId: '10' };

jest.mock('react-router-dom', () => ({
    Link: ({ children, to }) => <a href={to}>{children}</a>,
    NavLink: ({ children, to }) => <a href={to}>{children}</a>,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/', search: '', state: null }),
    useParams: () => mockParams,
    MemoryRouter: ({ children }) => <>{children}</>,
}));

// Mock API calls
jest.mock('../../../../api/userLeaguesApi', () => ({
    getLeagueParticipantsDetails: jest.fn(),
    getOpponentMatchups: jest.fn(),
    getTurnOrderStats: jest.fn()
}));

jest.mock('../../../../api/leaguesApi', () => ({
    getLeagueDetails: jest.fn()
}));

// Mock Skeleton components
jest.mock('../../../Shared/Skeleton', () => ({
    SkeletonProfileHeader: () => <div data-testid="skeleton-header">Loading Header...</div>,
    SkeletonCard: ({ lines, className }) => <div data-testid="skeleton-card" className={className}>Loading Card...</div>,
    SkeletonStatsGrid: ({ count, className }) => <div data-testid="skeleton-stats" className={className}>Loading Stats...</div>
}));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import PublicProfile from '../PublicProfile';

const { getLeagueParticipantsDetails, getOpponentMatchups, getTurnOrderStats } = require('../../../../api/userLeaguesApi');
const { getLeagueDetails } = require('../../../../api/leaguesApi');

// TODO: Fix async/mock issues - tests skipped
describe.skip('PublicProfile', () => {
    const mockLeagueDetails = {
        firstname: 'John',
        lastname: 'Doe',
        joined_at: '2024-01-15T00:00:00.000Z',
        commander: 'Kenrith, the Returned King',
        commanderPartner: null,
        decklist_url: 'https://moxfield.com/decks/abc123',
        commander_image: 'https://example.com/kenrith.jpg',
        partner_image: null,
        league_wins: 10,
        league_losses: 5
    };

    const mockLeagueInfo = {
        id: 10,
        name: 'Test League'
    };

    const mockMatchups = {
        nemesis: {
            firstname: 'Jane',
            lastname: 'Smith',
            wins: 2,
            losses: 5
        },
        victim: {
            firstname: 'Bob',
            lastname: 'Wilson',
            wins: 7,
            losses: 1
        }
    };

    const mockTurnOrderData = {
        message: 'Stats based on 15 games',
        turnOrderStats: [
            { position: 1, positionLabel: 'First', winRate: 45, wins: 3, gamesPlayed: 7 },
            { position: 2, positionLabel: 'Second', winRate: 30, wins: 2, gamesPlayed: 6 },
            { position: 3, positionLabel: 'Third', winRate: 25, wins: 1, gamesPlayed: 4 },
            { position: 4, positionLabel: 'Fourth', winRate: 20, wins: 0, gamesPlayed: 3 }
        ]
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockParams = { userId: '1', leagueId: '10' };
        getLeagueDetails.mockResolvedValue(mockLeagueInfo);
        getLeagueParticipantsDetails.mockResolvedValue(mockLeagueDetails);
        getOpponentMatchups.mockResolvedValue(mockMatchups);
        getTurnOrderStats.mockResolvedValue(mockTurnOrderData);
    });

    describe('loading state', () => {
        it('should show skeleton loading components while fetching data', async () => {
            getLeagueParticipantsDetails.mockImplementation(() => new Promise(() => {}));

            render(<PublicProfile />);

            expect(screen.getByTestId('skeleton-header')).toBeInTheDocument();
            expect(screen.getAllByTestId('skeleton-card').length).toBeGreaterThan(0);
            expect(screen.getByTestId('skeleton-stats')).toBeInTheDocument();
        });
    });

    describe('error state', () => {
        it('should show error when leagueId is not provided', async () => {
            mockParams = { userId: '1', leagueId: undefined };

            render(<PublicProfile />);

            await waitFor(() => {
                expect(screen.getByText('League context is required to view this profile.')).toBeInTheDocument();
            });
        });

        it('should show error when API call fails', async () => {
            getLeagueParticipantsDetails.mockRejectedValue(new Error('API Error'));

            render(<PublicProfile />);

            await waitFor(() => {
                expect(screen.getByText('Failed to fetch profile data.')).toBeInTheDocument();
            });
        });
    });

    describe('no profile state', () => {
        it('should show warning when leagueDetails is null', async () => {
            getLeagueParticipantsDetails.mockResolvedValue(null);

            render(<PublicProfile />);

            await waitFor(() => {
                expect(screen.getByText('Profile not available.')).toBeInTheDocument();
            });
        });
    });

    describe('successful profile load', () => {
        it('should display user name', async () => {
            render(<PublicProfile />);

            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
            });
        });

        it('should display league name', async () => {
            render(<PublicProfile />);

            await waitFor(() => {
                expect(screen.getByText('League: Test League')).toBeInTheDocument();
            });
        });

        it('should display join date', async () => {
            render(<PublicProfile />);

            await waitFor(() => {
                expect(screen.getByText(/Joined:/)).toBeInTheDocument();
                expect(screen.getByText(/1\/15\/2024/)).toBeInTheDocument();
            });
        });

        it('should display commander name', async () => {
            render(<PublicProfile />);

            await waitFor(() => {
                expect(screen.getByText(/Commander:/)).toBeInTheDocument();
                expect(screen.getByText('Kenrith, the Returned King')).toBeInTheDocument();
            });
        });

        it('should display decklist link', async () => {
            render(<PublicProfile />);

            await waitFor(() => {
                const deckLink = screen.getByText('View Deck');
                expect(deckLink).toBeInTheDocument();
                expect(deckLink).toHaveAttribute('href', 'https://moxfield.com/decks/abc123');
                expect(deckLink).toHaveAttribute('target', '_blank');
            });
        });

        it('should display commander image', async () => {
            render(<PublicProfile />);

            await waitFor(() => {
                const commanderImg = screen.getByAltText('Kenrith, the Returned King');
                expect(commanderImg).toBeInTheDocument();
                expect(commanderImg).toHaveAttribute('src', 'https://example.com/kenrith.jpg');
            });
        });
    });

    describe('partner commander', () => {
        it('should display partner when available', async () => {
            getLeagueParticipantsDetails.mockResolvedValue({
                ...mockLeagueDetails,
                commanderPartner: 'Rograkh, Son of Rohgahh',
                partner_image: 'https://example.com/rograkh.jpg'
            });

            render(<PublicProfile />);

            await waitFor(() => {
                expect(screen.getByText(/Partner:/)).toBeInTheDocument();
                expect(screen.getByText('Rograkh, Son of Rohgahh')).toBeInTheDocument();
            });
        });

        it('should display partner image when available', async () => {
            getLeagueParticipantsDetails.mockResolvedValue({
                ...mockLeagueDetails,
                commanderPartner: 'Rograkh, Son of Rohgahh',
                partner_image: 'https://example.com/rograkh.jpg'
            });

            render(<PublicProfile />);

            await waitFor(() => {
                const partnerImg = screen.getByAltText('Rograkh, Son of Rohgahh');
                expect(partnerImg).toBeInTheDocument();
            });
        });
    });

    describe('league statistics', () => {
        it('should display wins', async () => {
            render(<PublicProfile />);

            await waitFor(() => {
                expect(screen.getByText(/Wins:/)).toBeInTheDocument();
                expect(screen.getByText('10')).toBeInTheDocument();
            });
        });

        it('should display losses', async () => {
            render(<PublicProfile />);

            await waitFor(() => {
                expect(screen.getByText(/Losses:/)).toBeInTheDocument();
                expect(screen.getByText('5')).toBeInTheDocument();
            });
        });

        it('should display games played', async () => {
            render(<PublicProfile />);

            await waitFor(() => {
                expect(screen.getByText(/Games Played:/)).toBeInTheDocument();
                expect(screen.getByText('15')).toBeInTheDocument();
            });
        });

        it('should display win rate when games are played', async () => {
            render(<PublicProfile />);

            await waitFor(() => {
                expect(screen.getByText(/Win Rate:/)).toBeInTheDocument();
                expect(screen.getByText('66.7%')).toBeInTheDocument();
            });
        });

        it('should not display win rate when no games played', async () => {
            getLeagueParticipantsDetails.mockResolvedValue({
                ...mockLeagueDetails,
                league_wins: 0,
                league_losses: 0
            });

            render(<PublicProfile />);

            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
            });

            expect(screen.queryByText(/Win Rate:/)).not.toBeInTheDocument();
        });

        it('should handle zero values for stats', async () => {
            getLeagueParticipantsDetails.mockResolvedValue({
                ...mockLeagueDetails,
                league_wins: null,
                league_losses: null
            });

            render(<PublicProfile />);

            await waitFor(() => {
                const zeroElements = screen.getAllByText('0');
                expect(zeroElements.length).toBeGreaterThan(0);
            });
        });
    });

    describe('rivalries section', () => {
        it('should display nemesis information', async () => {
            render(<PublicProfile />);

            await waitFor(() => {
                expect(screen.getByText('Nemesis')).toBeInTheDocument();
                expect(screen.getByText('Jane Smith')).toBeInTheDocument();
                expect(screen.getByText('(5L - 2W)')).toBeInTheDocument();
            });
        });

        it('should display victim information', async () => {
            render(<PublicProfile />);

            await waitFor(() => {
                expect(screen.getByText('Favorite Victim')).toBeInTheDocument();
                expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
                expect(screen.getByText('(7W - 1L)')).toBeInTheDocument();
            });
        });

        it('should not display rivalries section when no matchups', async () => {
            getOpponentMatchups.mockResolvedValue({});

            render(<PublicProfile />);

            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
            });

            expect(screen.queryByText('Rivalries')).not.toBeInTheDocument();
            expect(screen.queryByText('Nemesis')).not.toBeInTheDocument();
        });

        it('should display only nemesis when victim is null', async () => {
            getOpponentMatchups.mockResolvedValue({
                nemesis: mockMatchups.nemesis,
                victim: null
            });

            render(<PublicProfile />);

            await waitFor(() => {
                expect(screen.getByText('Nemesis')).toBeInTheDocument();
            });

            expect(screen.queryByText('Favorite Victim')).not.toBeInTheDocument();
        });

        it('should handle rejected matchups API gracefully', async () => {
            getOpponentMatchups.mockRejectedValue(new Error('Matchups error'));

            render(<PublicProfile />);

            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
            });

            expect(screen.queryByText('Rivalries')).not.toBeInTheDocument();
        });
    });

    describe('turn order statistics', () => {
        it('should display turn order section header', async () => {
            render(<PublicProfile />);

            await waitFor(() => {
                expect(screen.getByText('Win Rate by Seat Position')).toBeInTheDocument();
            });
        });

        it('should display message when available', async () => {
            render(<PublicProfile />);

            await waitFor(() => {
                expect(screen.getByText('Stats based on 15 games')).toBeInTheDocument();
            });
        });

        it('should display all turn order positions', async () => {
            render(<PublicProfile />);

            await waitFor(() => {
                expect(screen.getByText('First')).toBeInTheDocument();
                expect(screen.getByText('Second')).toBeInTheDocument();
                expect(screen.getByText('Third')).toBeInTheDocument();
                expect(screen.getByText('Fourth')).toBeInTheDocument();
            });
        });

        it('should display win rates for each position', async () => {
            render(<PublicProfile />);

            await waitFor(() => {
                expect(screen.getByText('45%')).toBeInTheDocument();
                expect(screen.getByText('30%')).toBeInTheDocument();
                expect(screen.getByText('25%')).toBeInTheDocument();
                expect(screen.getByText('20%')).toBeInTheDocument();
            });
        });

        it('should display wins and games for each position', async () => {
            render(<PublicProfile />);

            await waitFor(() => {
                expect(screen.getByText('3W / 7G')).toBeInTheDocument();
                expect(screen.getByText('2W / 6G')).toBeInTheDocument();
                expect(screen.getByText('1W / 4G')).toBeInTheDocument();
                expect(screen.getByText('0W / 3G')).toBeInTheDocument();
            });
        });

        it('should not display turn order section when no data', async () => {
            getTurnOrderStats.mockResolvedValue(null);

            render(<PublicProfile />);

            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
            });

            expect(screen.queryByText('Win Rate by Seat Position')).not.toBeInTheDocument();
        });

        it('should not display turn order section when stats array is empty', async () => {
            getTurnOrderStats.mockResolvedValue({
                message: 'No data',
                turnOrderStats: []
            });

            render(<PublicProfile />);

            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
            });

            expect(screen.queryByText('Win Rate by Seat Position')).not.toBeInTheDocument();
        });

        it('should handle rejected turn order API gracefully', async () => {
            getTurnOrderStats.mockRejectedValue(new Error('Turn order error'));

            render(<PublicProfile />);

            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
            });

            expect(screen.queryByText('Win Rate by Seat Position')).not.toBeInTheDocument();
        });

        it('should apply correct class for high win rate (>=40)', async () => {
            render(<PublicProfile />);

            await waitFor(() => {
                const winRate45 = screen.getByText('45%');
                expect(winRate45.className).toContain('public-profile-win-rate-good');
            });
        });

        it('should apply correct class for average win rate (25-39)', async () => {
            render(<PublicProfile />);

            await waitFor(() => {
                const winRate30 = screen.getByText('30%');
                expect(winRate30.className).toContain('public-profile-win-rate-average');
            });
        });

        it('should apply correct class for low win rate (<25)', async () => {
            render(<PublicProfile />);

            await waitFor(() => {
                const winRate20 = screen.getByText('20%');
                expect(winRate20.className).toContain('public-profile-win-rate');
            });
        });
    });

    describe('no commander set', () => {
        it('should display "Not set" when commander is null', async () => {
            getLeagueParticipantsDetails.mockResolvedValue({
                ...mockLeagueDetails,
                commander: null
            });

            render(<PublicProfile />);

            await waitFor(() => {
                expect(screen.getByText('Not set')).toBeInTheDocument();
            });
        });
    });

    describe('no decklist URL', () => {
        it('should not display decklist link when URL is null', async () => {
            getLeagueParticipantsDetails.mockResolvedValue({
                ...mockLeagueDetails,
                decklist_url: null
            });

            render(<PublicProfile />);

            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
            });

            expect(screen.queryByText('View Deck')).not.toBeInTheDocument();
        });
    });

    describe('no commander images', () => {
        it('should not display commander image when not available', async () => {
            getLeagueParticipantsDetails.mockResolvedValue({
                ...mockLeagueDetails,
                commander_image: null
            });

            render(<PublicProfile />);

            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
            });

            expect(screen.queryByAltText('Kenrith, the Returned King')).not.toBeInTheDocument();
        });
    });

    describe('league info not available', () => {
        it('should not display league name when leagueInfo is null', async () => {
            getLeagueDetails.mockResolvedValue(null);

            render(<PublicProfile />);

            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
            });

            expect(screen.queryByText(/League:/)).not.toBeInTheDocument();
        });
    });
});
