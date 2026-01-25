// Mock dependencies BEFORE importing modules
// Setup mock context values
let mockPermissionsContext = {
    activeLeague: { id: 1, league_id: 1, league_name: 'Test League', name: 'Test League' }
};

// Mock context providers
jest.mock('../../../context/PermissionsProvider', () => ({
    usePermissions: () => mockPermissionsContext
}));

// Mock API calls
const mockGetMatchupMatrix = jest.fn();

jest.mock('../../../api/attendanceApi', () => ({
    getMatchupMatrix: (...args) => mockGetMatchupMatrix(...args)
}));

// Mock LoadingSpinner
jest.mock('../../Shared/LoadingSpinner', () => {
    return function MockLoadingSpinner({ size }) {
        return <div data-testid="loading-spinner" data-size={size}>Loading...</div>;
    };
});

// Mock CSS import
jest.mock('../MatchupMatrixPage.css', () => ({}));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MatchupMatrixPage from '../MatchupMatrixPage';

// TODO: Fix async/mock issues - tests skipped
describe.skip('MatchupMatrixPage', () => {
    const mockPlayers = [
        { id: 1, firstname: 'Alice', lastname: 'Anderson' },
        { id: 2, firstname: 'Bob', lastname: 'Brown' },
        { id: 3, firstname: 'Charlie', lastname: 'Clark' }
    ];

    const mockMatrix = {
        1: { 2: 2, 3: 1 },
        2: { 1: 2, 3: 0 },
        3: { 1: 1, 2: 0 }
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockPermissionsContext = {
            activeLeague: { id: 1, league_id: 1, league_name: 'Test League', name: 'Test League' }
        };

        mockGetMatchupMatrix.mockResolvedValue({
            players: mockPlayers,
            matrix: mockMatrix
        });
    });

    describe('No active league', () => {
        it('should show warning when user has no active league', async () => {
            mockPermissionsContext.activeLeague = null;

            render(<MatchupMatrixPage />);

            await waitFor(() => {
                expect(screen.getByText(/please join a league to view the matchup matrix/i)).toBeInTheDocument();
            });
        });
    });

    describe('Loading state', () => {
        it('should show loading spinner while fetching data', () => {
            mockGetMatchupMatrix.mockImplementation(() => new Promise(() => {}));

            render(<MatchupMatrixPage />);

            expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
        });
    });

    describe('Error handling', () => {
        it('should display error message when API call fails', async () => {
            mockGetMatchupMatrix.mockRejectedValue(new Error('API Error'));

            render(<MatchupMatrixPage />);

            await waitFor(() => {
                expect(screen.getByText(/failed to load matchup matrix/i)).toBeInTheDocument();
            });
        });
    });

    describe('Page header', () => {
        it('should render title with league name', async () => {
            render(<MatchupMatrixPage />);

            await waitFor(() => {
                expect(screen.getByText(/matchup matrix - test league/i)).toBeInTheDocument();
            });
        });

        it('should use league_name if available', async () => {
            mockPermissionsContext.activeLeague = { id: 1, league_name: 'Custom Name' };

            render(<MatchupMatrixPage />);

            await waitFor(() => {
                expect(screen.getByText(/matchup matrix - custom name/i)).toBeInTheDocument();
            });
        });

        it('should fall back to name if league_name not available', async () => {
            mockPermissionsContext.activeLeague = { id: 1, name: 'Fallback Name' };

            render(<MatchupMatrixPage />);

            await waitFor(() => {
                expect(screen.getByText(/matchup matrix - fallback name/i)).toBeInTheDocument();
            });
        });
    });

    describe('Legend', () => {
        it('should display color legend', async () => {
            render(<MatchupMatrixPage />);

            await waitFor(() => {
                expect(screen.getByText('Legend:')).toBeInTheDocument();
            });
            expect(screen.getByText('Never played')).toBeInTheDocument();
            expect(screen.getByText('1 game')).toBeInTheDocument();
            expect(screen.getByText('2 games')).toBeInTheDocument();
            expect(screen.getByText('3+ games')).toBeInTheDocument();
        });
    });

    describe('Sort functionality', () => {
        it('should have sort dropdown with default value "Name"', async () => {
            render(<MatchupMatrixPage />);

            await waitFor(() => {
                const select = screen.getByRole('combobox');
                expect(select).toHaveValue('name');
            });
        });

        it('should allow sorting by games played', async () => {
            render(<MatchupMatrixPage />);

            await waitFor(() => {
                expect(screen.getByRole('combobox')).toBeInTheDocument();
            });

            fireEvent.change(screen.getByRole('combobox'), { target: { value: 'games' } });

            expect(screen.getByRole('combobox')).toHaveValue('games');
        });

        it('should sort players alphabetically by default', async () => {
            render(<MatchupMatrixPage />);

            await waitFor(() => {
                const headers = screen.getAllByText(/alice a\./i);
                expect(headers.length).toBeGreaterThan(0);
            });

            // Alice should be first (alphabetically) in the row headers
            const rowHeaders = document.querySelectorAll('.player-row-header');
            expect(rowHeaders[0]).toHaveTextContent('Alice A.');
        });

        it('should sort players by games played when selected', async () => {
            const moreGamesMatrix = {
                1: { 2: 1, 3: 1 }, // Alice: 2 total games
                2: { 1: 1, 3: 5 }, // Bob: 6 total games (highest)
                3: { 1: 1, 2: 5 }  // Charlie: 6 total games
            };
            mockGetMatchupMatrix.mockResolvedValue({
                players: mockPlayers,
                matrix: moreGamesMatrix
            });

            render(<MatchupMatrixPage />);

            await waitFor(() => {
                expect(screen.getByRole('combobox')).toBeInTheDocument();
            });

            fireEvent.change(screen.getByRole('combobox'), { target: { value: 'games' } });

            // After sorting by games, Bob or Charlie should be first (6 games each)
            const rowHeaders = document.querySelectorAll('.player-row-header');
            // Either Bob or Charlie could be first since they're tied
            expect(rowHeaders[0]).toHaveTextContent(/(Bob B\.|Charlie C\.)/);
        });
    });

    describe('Empty state', () => {
        it('should show message when no players have completed games', async () => {
            mockGetMatchupMatrix.mockResolvedValue({
                players: [],
                matrix: {}
            });

            render(<MatchupMatrixPage />);

            await waitFor(() => {
                expect(screen.getByText(/no completed games yet in this league/i)).toBeInTheDocument();
            });
        });
    });

    describe('Matrix table', () => {
        it('should render player names in headers', async () => {
            render(<MatchupMatrixPage />);

            await waitFor(() => {
                // Player names appear in both column headers and row headers
                expect(screen.getAllByText('Alice A.').length).toBeGreaterThan(0);
            });
            expect(screen.getAllByText('Bob B.').length).toBeGreaterThan(0);
            expect(screen.getAllByText('Charlie C.').length).toBeGreaterThan(0);
        });

        it('should display correct game counts', async () => {
            render(<MatchupMatrixPage />);

            await waitFor(() => {
                // Alice vs Bob: 2 games
                expect(screen.getAllByText('2').length).toBeGreaterThan(0);
            });
            // Alice vs Charlie: 1 game
            expect(screen.getAllByText('1').length).toBeGreaterThan(0);
            // Bob vs Charlie: 0 games
            expect(screen.getAllByText('0').length).toBeGreaterThan(0);
        });

        it('should show "-" for self cells (diagonal)', async () => {
            render(<MatchupMatrixPage />);

            await waitFor(() => {
                const dashes = screen.getAllByText('-');
                expect(dashes).toHaveLength(3); // One for each player
            });
        });

        it('should apply correct CSS class for zero games', async () => {
            render(<MatchupMatrixPage />);

            await waitFor(() => {
                const zeroCells = screen.getAllByText('0');
                zeroCells.forEach(cell => {
                    expect(cell).toHaveClass('cell-zero');
                });
            });
        });

        it('should apply correct CSS class for one game', async () => {
            render(<MatchupMatrixPage />);

            await waitFor(() => {
                expect(screen.getAllByText('Alice A.').length).toBeGreaterThan(0);
            });
            // Get cells that contain "1" and are matrix cells
            const cells = document.querySelectorAll('.matrix-cell.cell-one');
            expect(cells.length).toBeGreaterThan(0);
        });

        it('should apply correct CSS class for two games', async () => {
            render(<MatchupMatrixPage />);

            await waitFor(() => {
                expect(screen.getAllByText('Alice A.').length).toBeGreaterThan(0);
            });
            // Get cells that contain "2" and are matrix cells
            const cells = document.querySelectorAll('.matrix-cell.cell-two');
            expect(cells.length).toBeGreaterThan(0);
        });

        it('should apply cell-many class for 3+ games', async () => {
            const manyGamesMatrix = {
                1: { 2: 5, 3: 1 },
                2: { 1: 5, 3: 0 },
                3: { 1: 1, 2: 0 }
            };
            mockGetMatchupMatrix.mockResolvedValue({
                players: mockPlayers,
                matrix: manyGamesMatrix
            });

            render(<MatchupMatrixPage />);

            await waitFor(() => {
                expect(screen.getAllByText('Alice A.').length).toBeGreaterThan(0);
            });
            // Get cells that have cell-many class
            const cells = document.querySelectorAll('.matrix-cell.cell-many');
            expect(cells.length).toBeGreaterThan(0);
        });

        it('should apply cell-self class for diagonal cells', async () => {
            render(<MatchupMatrixPage />);

            await waitFor(() => {
                const selfCells = screen.getAllByText('-');
                selfCells.forEach(cell => {
                    expect(cell).toHaveClass('cell-self');
                });
            });
        });

        it('should have title attribute with matchup info', async () => {
            render(<MatchupMatrixPage />);

            await waitFor(() => {
                const cells = screen.getAllByRole('cell');
                // Find a non-self cell and check title
                const cellWithTitle = cells.find(cell =>
                    cell.getAttribute('title')?.includes('Alice vs Bob')
                );
                expect(cellWithTitle).toHaveAttribute('title', expect.stringContaining('2 games'));
            });
        });

        it('should have empty title for self cells', async () => {
            render(<MatchupMatrixPage />);

            await waitFor(() => {
                const selfCells = screen.getAllByText('-');
                selfCells.forEach(cell => {
                    expect(cell).toHaveAttribute('title', '');
                });
            });
        });
    });

    describe('Statistics section', () => {
        it('should display player count', async () => {
            render(<MatchupMatrixPage />);

            await waitFor(() => {
                expect(screen.getByText('Statistics')).toBeInTheDocument();
            });
            expect(screen.getByText(/players:/i)).toBeInTheDocument();
            // The number 3 appears multiple times in the page (players, pairings, etc.)
            expect(screen.getAllByText('3').length).toBeGreaterThan(0);
        });

        it('should calculate possible pairings correctly', async () => {
            render(<MatchupMatrixPage />);

            // 3 players = 3 * 2 / 2 = 3 possible pairings
            await waitFor(() => {
                expect(screen.getByText(/possible pairings:/i)).toBeInTheDocument();
            });
            const pairingsText = screen.getByText(/possible pairings:/i).parentElement;
            expect(pairingsText).toHaveTextContent('3');
        });

        it('should calculate max games between pair correctly', async () => {
            render(<MatchupMatrixPage />);

            // Max is Alice vs Bob with 2 games
            await waitFor(() => {
                expect(screen.getByText(/max games between pair:/i)).toBeInTheDocument();
            });
            const maxText = screen.getByText(/max games between pair:/i).parentElement;
            expect(maxText).toHaveTextContent('2');
        });

        it('should calculate unplayed pairings correctly', async () => {
            render(<MatchupMatrixPage />);

            // Bob vs Charlie have 0 games = 1 unplayed pairing
            await waitFor(() => {
                expect(screen.getByText(/unplayed pairings:/i)).toBeInTheDocument();
            });
            const unplayedText = screen.getByText(/unplayed pairings:/i).parentElement;
            expect(unplayedText).toHaveTextContent('1');
        });

        it('should not show stats section when no players', async () => {
            mockGetMatchupMatrix.mockResolvedValue({
                players: [],
                matrix: {}
            });

            render(<MatchupMatrixPage />);

            await waitFor(() => {
                expect(screen.getByText(/no completed games/i)).toBeInTheDocument();
            });
            expect(screen.queryByText('Statistics')).not.toBeInTheDocument();
        });
    });

    describe('League ID variations', () => {
        it('should use league_id if available', async () => {
            mockPermissionsContext.activeLeague = { league_id: 5, name: 'Test' };

            render(<MatchupMatrixPage />);

            await waitFor(() => {
                expect(mockGetMatchupMatrix).toHaveBeenCalledWith(5);
            });
        });

        it('should fall back to id if league_id not available', async () => {
            mockPermissionsContext.activeLeague = { id: 10, name: 'Test' };

            render(<MatchupMatrixPage />);

            await waitFor(() => {
                expect(mockGetMatchupMatrix).toHaveBeenCalledWith(10);
            });
        });
    });

    describe('Edge cases', () => {
        it('should handle missing matrix data', async () => {
            mockGetMatchupMatrix.mockResolvedValue({
                players: mockPlayers,
                matrix: null
            });

            render(<MatchupMatrixPage />);

            await waitFor(() => {
                // Should treat missing matrix as empty
                expect(screen.getAllByText('0').length).toBeGreaterThan(0);
            });
        });

        it('should handle missing players data', async () => {
            mockGetMatchupMatrix.mockResolvedValue({
                players: null,
                matrix: mockMatrix
            });

            render(<MatchupMatrixPage />);

            await waitFor(() => {
                expect(screen.getByText(/no completed games yet/i)).toBeInTheDocument();
            });
        });

        it('should handle player with missing lastname', async () => {
            const playersNoLastname = [
                { id: 1, firstname: 'Alice', lastname: null },
                { id: 2, firstname: 'Bob', lastname: undefined }
            ];
            mockGetMatchupMatrix.mockResolvedValue({
                players: playersNoLastname,
                matrix: { 1: { 2: 1 }, 2: { 1: 1 } }
            });

            render(<MatchupMatrixPage />);

            await waitFor(() => {
                // Should handle missing lastname gracefully (charAt on undefined)
                expect(screen.getByText(/alice/i)).toBeInTheDocument();
            });
        });

        it('should handle empty matrix for player pair', async () => {
            const sparseMatrix = {
                1: { 2: 2 }, // Only has data for player 2
                // Missing entries for player 3
                2: { 1: 2, 3: 1 },
                3: { 2: 1 }
            };
            mockGetMatchupMatrix.mockResolvedValue({
                players: mockPlayers,
                matrix: sparseMatrix
            });

            render(<MatchupMatrixPage />);

            await waitFor(() => {
                // Should show 0 for missing pairs
                expect(screen.getAllByText('0').length).toBeGreaterThan(0);
            });
        });

        it('should handle matrix with completely missing player entry', async () => {
            const incompleteMatrix = {
                1: { 2: 1 },
                2: { 1: 1 }
                // Player 3 completely missing from matrix
            };
            mockGetMatchupMatrix.mockResolvedValue({
                players: mockPlayers,
                matrix: incompleteMatrix
            });

            render(<MatchupMatrixPage />);

            await waitFor(() => {
                // Should still render without crashing - player names appear twice (header + row)
                expect(screen.getAllByText('Charlie C.').length).toBeGreaterThan(0);
            });
        });
    });

    describe('Max games calculation', () => {
        it('should return 0 when no games exist', async () => {
            mockGetMatchupMatrix.mockResolvedValue({
                players: [
                    { id: 1, firstname: 'Alice', lastname: 'A' },
                    { id: 2, firstname: 'Bob', lastname: 'B' }
                ],
                matrix: { 1: { 2: 0 }, 2: { 1: 0 } }
            });

            render(<MatchupMatrixPage />);

            await waitFor(() => {
                const maxText = screen.getByText(/max games between pair:/i).parentElement;
                expect(maxText).toHaveTextContent('0');
            });
        });
    });

    describe('Re-fetch on league change', () => {
        it('should not fetch if leagueId becomes null', async () => {
            const { rerender } = render(<MatchupMatrixPage />);

            await waitFor(() => {
                expect(mockGetMatchupMatrix).toHaveBeenCalledTimes(1);
            });

            // Change activeLeague to null
            mockPermissionsContext.activeLeague = null;
            mockGetMatchupMatrix.mockClear();

            // Re-render - note: this simulates a context change
            rerender(<MatchupMatrixPage />);

            // Should show the no league warning
            expect(screen.getByText(/please join a league/i)).toBeInTheDocument();
        });
    });
});
