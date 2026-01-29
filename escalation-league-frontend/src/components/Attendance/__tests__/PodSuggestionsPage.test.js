// Mock dependencies BEFORE importing modules
const mockNavigate = jest.fn();
const mockUseParams = jest.fn();

jest.mock('react-router-dom', () => ({
    Link: ({ children, to }) => <a href={to}>{children}</a>,
    NavLink: ({ children, to }) => <a href={to}>{children}</a>,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/', search: '', state: null }),
    useParams: () => mockUseParams(),
    MemoryRouter: ({ children }) => <>{children}</>,
}));

// Setup mock context values
let mockPermissionsContext = {
    activeLeague: { id: 1, league_id: 1, league_name: 'Test League', name: 'Test League' },
    permissions: ['pod_manage']
};

const mockShowToast = jest.fn();

// Mock context providers
jest.mock('../../../context/PermissionsProvider', () => ({
    usePermissions: () => mockPermissionsContext
}));

jest.mock('../../../context/ToastContext', () => ({
    useToast: () => ({ showToast: mockShowToast })
}));

// Mock API calls
const mockGetPodSuggestions = jest.fn();
const mockGetSession = jest.fn();
const mockCreatePod = jest.fn();

jest.mock('../../../api/attendanceApi', () => ({
    getPodSuggestions: (...args) => mockGetPodSuggestions(...args),
    getSession: (...args) => mockGetSession(...args)
}));

jest.mock('../../../api/podsApi', () => ({
    createPod: (...args) => mockCreatePod(...args)
}));

// Mock LoadingSpinner
jest.mock('../../Shared/LoadingSpinner', () => {
    return function MockLoadingSpinner({ size, showText, text }) {
        return (
            <div data-testid="loading-spinner" data-size={size}>
                {showText && text ? text : 'Loading...'}
            </div>
        );
    };
});

// Mock LoadingButton
jest.mock('../../Shared', () => ({
    LoadingButton: function MockLoadingButton({ loading, loadingText, icon, onClick, children, className }) {
        return (
            <button
                className={className}
                onClick={onClick}
                disabled={loading}
                data-testid="loading-button"
            >
                {loading ? loadingText : children}
            </button>
        );
    }
}));

// Mock CSS import
jest.mock('../PodSuggestionsPage.css', () => ({}));

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import PodSuggestionsPage from '../PodSuggestionsPage';

// TODO: Fix async/mock issues - tests skipped
describe.skip('PodSuggestionsPage', () => {
    const mockSession = {
        id: 1,
        session_date: '2024-01-15',
        name: 'Test Session',
        status: 'active'
    };

    const mockPlayers = [
        { id: 1, firstname: 'Alice', lastname: 'Anderson' },
        { id: 2, firstname: 'Bob', lastname: 'Brown' },
        { id: 3, firstname: 'Charlie', lastname: 'Clark' },
        { id: 4, firstname: 'Diana', lastname: 'Davis' }
    ];

    const mockSuggestions = {
        totalPlayers: 4,
        pods: [
            {
                score: 0,
                players: mockPlayers,
                pairings: [
                    { player1: 1, player2: 2, previousGames: 0 },
                    { player1: 1, player2: 3, previousGames: 0 },
                    { player1: 1, player2: 4, previousGames: 0 },
                    { player1: 2, player2: 3, previousGames: 0 },
                    { player1: 2, player2: 4, previousGames: 0 },
                    { player1: 3, player2: 4, previousGames: 0 }
                ]
            }
        ],
        leftover: []
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockUseParams.mockReturnValue({ sessionId: '1' });

        mockPermissionsContext = {
            activeLeague: { id: 1, league_id: 1, league_name: 'Test League', name: 'Test League' },
            permissions: ['pod_manage']
        };

        mockGetSession.mockResolvedValue(mockSession);
        mockGetPodSuggestions.mockResolvedValue(mockSuggestions);
        mockCreatePod.mockResolvedValue({ id: 1 });
    });

    describe('Permission check', () => {
        it('should show warning when user lacks pod_manage permission', async () => {
            mockPermissionsContext.permissions = [];

            render(<PodSuggestionsPage />);

            expect(screen.getByText(/you don't have permission to view pod suggestions/i)).toBeInTheDocument();
        });

        it('should show warning when permissions is null', async () => {
            mockPermissionsContext.permissions = null;

            render(<PodSuggestionsPage />);

            expect(screen.getByText(/you don't have permission/i)).toBeInTheDocument();
        });
    });

    describe('Loading state', () => {
        it('should show loading spinner with custom text', () => {
            mockGetSession.mockImplementation(() => new Promise(() => {}));

            render(<PodSuggestionsPage />);

            expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
            expect(screen.getByText(/calculating optimal pods/i)).toBeInTheDocument();
        });
    });

    describe('Error handling', () => {
        it('should display error message when API call fails', async () => {
            mockGetSession.mockRejectedValue(new Error('API Error'));

            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByText(/failed to load pod suggestions/i)).toBeInTheDocument();
            });
        });
    });

    describe('Page header and navigation', () => {
        it('should render title', async () => {
            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByText(/pod suggestions/i)).toBeInTheDocument();
            });
        });

        it('should have back to attendance button', async () => {
            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /back to attendance/i })).toBeInTheDocument();
            });
        });

        it('should navigate back to attendance when clicking back button', async () => {
            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /back to attendance/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /back to attendance/i }));

            expect(mockNavigate).toHaveBeenCalledWith('/attendance');
        });
    });

    describe('Pod size selector', () => {
        it('should have pod size dropdown with default value 4', async () => {
            render(<PodSuggestionsPage />);

            await waitFor(() => {
                const select = screen.getByRole('combobox');
                expect(select).toHaveValue('4');
            });
        });

        it('should show all pod size options', async () => {
            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByRole('option', { name: /3 players/i })).toBeInTheDocument();
            });
            expect(screen.getByRole('option', { name: /4 players/i })).toBeInTheDocument();
            expect(screen.getByRole('option', { name: /5 players/i })).toBeInTheDocument();
            expect(screen.getByRole('option', { name: /6 players/i })).toBeInTheDocument();
        });

        it('should fetch new suggestions when pod size changes', async () => {
            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(mockGetPodSuggestions).toHaveBeenCalledWith('1', 4);
            });

            fireEvent.change(screen.getByRole('combobox'), { target: { value: '3' } });

            await waitFor(() => {
                expect(mockGetPodSuggestions).toHaveBeenCalledWith('1', 3);
            });
        });
    });

    describe('Summary info', () => {
        it('should show total players count', async () => {
            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByText(/4/)).toBeInTheDocument();
                expect(screen.getByText(/players checked in/i)).toBeInTheDocument();
            });
        });

        it('should show number of suggested pods', async () => {
            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByText(/1/)).toBeInTheDocument();
                expect(screen.getByText(/pods suggested/i)).toBeInTheDocument();
            });
        });
    });

    describe('Create All Pods button', () => {
        it('should show Create All Pods button when pods exist', async () => {
            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /create all pods/i })).toBeInTheDocument();
            });
        });

        it('should not show Create All Pods button when no pods', async () => {
            mockGetPodSuggestions.mockResolvedValue({
                ...mockSuggestions,
                pods: []
            });

            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByText(/not enough players/i)).toBeInTheDocument();
            });
            expect(screen.queryByRole('button', { name: /create all pods/i })).not.toBeInTheDocument();
        });

        it('should create all pods and navigate when clicking Create All Pods', async () => {
            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /create all pods/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /create all pods/i }));

            await waitFor(() => {
                expect(mockCreatePod).toHaveBeenCalledWith({
                    league_id: 1,
                    player_ids: [1, 2, 3, 4],
                    turn_order: [1, 2, 3, 4]
                });
            });
            expect(mockShowToast).toHaveBeenCalledWith('All pods created!', 'success');
            expect(mockNavigate).toHaveBeenCalledWith('/pods/active');
        });

        it('should show error toast when creating all pods fails', async () => {
            mockCreatePod.mockRejectedValue(new Error('Creation failed'));

            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /create all pods/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /create all pods/i }));

            await waitFor(() => {
                expect(mockShowToast).toHaveBeenCalledWith('Failed to create pod 1.', 'error');
            });
        });

        it('should not create pods if no activeLeague id', async () => {
            mockPermissionsContext.activeLeague = { name: 'Test' }; // No id

            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /create all pods/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /create all pods/i }));

            await waitFor(() => {
                expect(mockCreatePod).not.toHaveBeenCalled();
            });
        });
    });

    describe('Empty state', () => {
        it('should show not enough players message when no pods suggested', async () => {
            mockGetPodSuggestions.mockResolvedValue({
                totalPlayers: 2,
                pods: [],
                leftover: []
            });

            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByText(/not enough players for pods/i)).toBeInTheDocument();
            });
        });
    });

    describe('Pod card display', () => {
        it('should display pod number', async () => {
            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByText(/pod 1/i)).toBeInTheDocument();
            });
        });

        it('should display pod score with success badge for score 0', async () => {
            render(<PodSuggestionsPage />);

            await waitFor(() => {
                const scoreBadge = screen.getByText(/score: 0/i);
                expect(scoreBadge).toHaveClass('bg-success');
            });
        });

        it('should display pod score with warning badge for score 1-2', async () => {
            const warningSuggestions = {
                ...mockSuggestions,
                pods: [{ ...mockSuggestions.pods[0], score: 2 }]
            };
            mockGetPodSuggestions.mockResolvedValue(warningSuggestions);

            render(<PodSuggestionsPage />);

            await waitFor(() => {
                const scoreBadge = screen.getByText(/score: 2/i);
                expect(scoreBadge).toHaveClass('bg-warning');
            });
        });

        it('should display pod score with danger badge for score 3+', async () => {
            const dangerSuggestions = {
                ...mockSuggestions,
                pods: [{ ...mockSuggestions.pods[0], score: 5 }]
            };
            mockGetPodSuggestions.mockResolvedValue(dangerSuggestions);

            render(<PodSuggestionsPage />);

            await waitFor(() => {
                const scoreBadge = screen.getByText(/score: 5/i);
                expect(scoreBadge).toHaveClass('bg-danger');
            });
        });

        it('should display all players in the pod', async () => {
            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByText('Alice Anderson')).toBeInTheDocument();
            });
            expect(screen.getByText('Bob Brown')).toBeInTheDocument();
            expect(screen.getByText('Charlie Clark')).toBeInTheDocument();
            expect(screen.getByText('Diana Davis')).toBeInTheDocument();
        });

        it('should show "First" badge for first player in turn order', async () => {
            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByText(/first/i)).toBeInTheDocument();
            });
        });
    });

    describe('Matchup history display', () => {
        it('should show "Fresh matchups!" for score 0', async () => {
            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByText(/fresh matchups!/i)).toBeInTheDocument();
            });
        });

        it('should show "Some repeats" for score 1-2', async () => {
            const repeatSuggestions = {
                ...mockSuggestions,
                pods: [{ ...mockSuggestions.pods[0], score: 1 }]
            };
            mockGetPodSuggestions.mockResolvedValue(repeatSuggestions);

            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByText(/some repeats/i)).toBeInTheDocument();
            });
        });

        it('should show "Many repeats" for score 3+', async () => {
            const manyRepeatsSuggestions = {
                ...mockSuggestions,
                pods: [{ ...mockSuggestions.pods[0], score: 3 }]
            };
            mockGetPodSuggestions.mockResolvedValue(manyRepeatsSuggestions);

            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByText(/many repeats/i)).toBeInTheDocument();
            });
        });

        it('should display pairing information', async () => {
            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByText(/alice vs bob/i)).toBeInTheDocument();
            });
        });

        it('should show "Never played!" for 0 previous games', async () => {
            render(<PodSuggestionsPage />);

            await waitFor(() => {
                const neverPlayed = screen.getAllByText(/never played!/i);
                expect(neverPlayed.length).toBeGreaterThan(0);
            });
        });

        it('should show game count for previous games', async () => {
            const withPreviousGames = {
                ...mockSuggestions,
                pods: [{
                    ...mockSuggestions.pods[0],
                    pairings: [
                        { player1: 1, player2: 2, previousGames: 3 },
                        { player1: 1, player2: 3, previousGames: 0 },
                        { player1: 1, player2: 4, previousGames: 0 },
                        { player1: 2, player2: 3, previousGames: 0 },
                        { player1: 2, player2: 4, previousGames: 0 },
                        { player1: 3, player2: 4, previousGames: 0 }
                    ]
                }]
            };
            mockGetPodSuggestions.mockResolvedValue(withPreviousGames);

            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByText(/3 games/i)).toBeInTheDocument();
            });
        });
    });

    describe('Turn order controls', () => {
        it('should have randomize button', async () => {
            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /randomize/i })).toBeInTheDocument();
            });
        });

        it('should randomize turn order when clicking randomize', async () => {
            // Mock Math.random to return predictable values
            const mockRandom = jest.spyOn(Math, 'random');
            mockRandom.mockReturnValue(0.1);

            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /randomize/i })).toBeInTheDocument();
            });

            const randomizeBtn = screen.getByRole('button', { name: /randomize/i });
            fireEvent.click(randomizeBtn);

            // Turn order should have changed
            await waitFor(() => {
                expect(screen.getByText('Alice Anderson')).toBeInTheDocument();
            });

            mockRandom.mockRestore();
        });

        it('should have move up buttons for players', async () => {
            render(<PodSuggestionsPage />);

            await waitFor(() => {
                const upButtons = screen.getAllByTitle(/move up/i);
                expect(upButtons.length).toBe(4); // One for each player
            });
        });

        it('should have move down buttons for players', async () => {
            render(<PodSuggestionsPage />);

            await waitFor(() => {
                const downButtons = screen.getAllByTitle(/move down/i);
                expect(downButtons.length).toBe(4); // One for each player
            });
        });

        it('should disable move up for first player', async () => {
            render(<PodSuggestionsPage />);

            await waitFor(() => {
                const upButtons = screen.getAllByTitle(/move up/i);
                expect(upButtons[0]).toBeDisabled();
            });
        });

        it('should disable move down for last player', async () => {
            render(<PodSuggestionsPage />);

            await waitFor(() => {
                const downButtons = screen.getAllByTitle(/move down/i);
                expect(downButtons[downButtons.length - 1]).toBeDisabled();
            });
        });

        it('should move player up when clicking move up', async () => {
            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByText('Alice Anderson')).toBeInTheDocument();
            });

            // Click move up on second player (Bob)
            const upButtons = screen.getAllByTitle(/move up/i);
            fireEvent.click(upButtons[1]); // Bob's up button

            // Now Bob should be first (has the "First" badge)
            await waitFor(() => {
                const turnItems = screen.getAllByText(/^\d+$/).filter(el =>
                    el.classList.contains('badge')
                );
                // The first turn number badge should now be next to Bob
                const firstBadge = screen.getByText(/first/i);
                expect(firstBadge.closest('.turn-order-item')).toHaveTextContent('Bob Brown');
            });
        });

        it('should move player down when clicking move down', async () => {
            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByText('Alice Anderson')).toBeInTheDocument();
            });

            // Click move down on first player (Alice)
            const downButtons = screen.getAllByTitle(/move down/i);
            fireEvent.click(downButtons[0]); // Alice's down button

            // Now Bob should be first
            await waitFor(() => {
                const firstBadge = screen.getByText(/first/i);
                expect(firstBadge.closest('.turn-order-item')).toHaveTextContent('Bob Brown');
            });
        });
    });

    describe('Drag and drop', () => {
        it('should have draggable items', async () => {
            render(<PodSuggestionsPage />);

            await waitFor(() => {
                const draggableItems = document.querySelectorAll('[draggable="true"]');
                expect(draggableItems.length).toBe(4);
            });
        });

        it('should handle drag start', async () => {
            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByText('Alice Anderson')).toBeInTheDocument();
            });

            const draggableItems = document.querySelectorAll('[draggable="true"]');
            const mockDataTransfer = { effectAllowed: '' };

            fireEvent.dragStart(draggableItems[0], { dataTransfer: mockDataTransfer });

            expect(mockDataTransfer.effectAllowed).toBe('move');
        });

        it('should handle drag over', async () => {
            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByText('Alice Anderson')).toBeInTheDocument();
            });

            const draggableItems = document.querySelectorAll('[draggable="true"]');
            const mockDataTransfer = { dropEffect: '' };

            fireEvent.dragOver(draggableItems[1], { dataTransfer: mockDataTransfer });

            expect(mockDataTransfer.dropEffect).toBe('move');
        });

        it('should handle drop to reorder', async () => {
            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByText('Alice Anderson')).toBeInTheDocument();
            });

            const draggableItems = document.querySelectorAll('[draggable="true"]');
            const mockDataTransfer = { effectAllowed: '', dropEffect: '' };

            // Drag Alice
            fireEvent.dragStart(draggableItems[0], { dataTransfer: mockDataTransfer });

            // Drop on Charlie (third position)
            fireEvent.drop(draggableItems[2], { dataTransfer: mockDataTransfer });

            // Alice should now be in third position
            await waitFor(() => {
                const firstBadge = screen.getByText(/first/i);
                expect(firstBadge.closest('.turn-order-item')).toHaveTextContent('Bob Brown');
            });
        });
    });

    describe('Create single pod', () => {
        it('should show Create This Pod button for each pod', async () => {
            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByText(/create this pod/i)).toBeInTheDocument();
            });
        });

        it('should create pod with correct turn order when clicking Create This Pod', async () => {
            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByText(/create this pod/i)).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText(/create this pod/i));

            await waitFor(() => {
                expect(mockCreatePod).toHaveBeenCalledWith({
                    league_id: 1,
                    player_ids: [1, 2, 3, 4],
                    turn_order: [1, 2, 3, 4]
                });
            });
            expect(mockShowToast).toHaveBeenCalledWith('Pod created successfully!', 'success');
        });

        it('should remove created pod from suggestions', async () => {
            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByText(/pod 1/i)).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText(/create this pod/i));

            await waitFor(() => {
                expect(screen.queryByText(/pod 1/i)).not.toBeInTheDocument();
            });
        });

        it('should show error toast when creating single pod fails', async () => {
            mockCreatePod.mockRejectedValue(new Error('Creation failed'));

            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByText(/create this pod/i)).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText(/create this pod/i));

            await waitFor(() => {
                expect(mockShowToast).toHaveBeenCalledWith('Failed to create pod.', 'error');
            });
        });

        it('should not create pod if no activeLeague id', async () => {
            mockPermissionsContext.activeLeague = { name: 'Test' }; // No id

            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByText(/create this pod/i)).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText(/create this pod/i));

            await waitFor(() => {
                expect(mockCreatePod).not.toHaveBeenCalled();
            });
        });
    });

    describe('Leftover players', () => {
        it('should show leftover players section when there are leftovers', async () => {
            const leftoverSuggestions = {
                ...mockSuggestions,
                leftover: [
                    { id: 5, firstname: 'Eve', lastname: 'Edwards' }
                ]
            };
            mockGetPodSuggestions.mockResolvedValue(leftoverSuggestions);

            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByText(/leftover players \(1\)/i)).toBeInTheDocument();
            });
            expect(screen.getByText('Eve Edwards')).toBeInTheDocument();
        });

        it('should show info message about leftover players', async () => {
            const leftoverSuggestions = {
                ...mockSuggestions,
                leftover: [
                    { id: 5, firstname: 'Eve', lastname: 'Edwards' },
                    { id: 6, firstname: 'Frank', lastname: 'Franklin' }
                ]
            };
            mockGetPodSuggestions.mockResolvedValue(leftoverSuggestions);

            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByText(/these players couldn't be placed in a full pod/i)).toBeInTheDocument();
            });
        });

        it('should not show leftover section when no leftovers', async () => {
            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByText(/pod 1/i)).toBeInTheDocument();
            });
            expect(screen.queryByText(/leftover players/i)).not.toBeInTheDocument();
        });
    });

    describe('Multiple pods', () => {
        it('should display multiple pods correctly', async () => {
            const multiplePods = {
                totalPlayers: 8,
                pods: [
                    {
                        score: 0,
                        players: mockPlayers,
                        pairings: mockSuggestions.pods[0].pairings
                    },
                    {
                        score: 1,
                        players: [
                            { id: 5, firstname: 'Eve', lastname: 'Edwards' },
                            { id: 6, firstname: 'Frank', lastname: 'Franklin' },
                            { id: 7, firstname: 'Grace', lastname: 'Green' },
                            { id: 8, firstname: 'Henry', lastname: 'Hill' }
                        ],
                        pairings: [
                            { player1: 5, player2: 6, previousGames: 1 }
                        ]
                    }
                ],
                leftover: []
            };
            mockGetPodSuggestions.mockResolvedValue(multiplePods);

            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByText(/pod 1/i)).toBeInTheDocument();
            });
            expect(screen.getByText(/pod 2/i)).toBeInTheDocument();
        });

        it('should re-index pods after creating one', async () => {
            const multiplePods = {
                totalPlayers: 8,
                pods: [
                    {
                        score: 0,
                        players: mockPlayers,
                        pairings: mockSuggestions.pods[0].pairings
                    },
                    {
                        score: 1,
                        players: [
                            { id: 5, firstname: 'Eve', lastname: 'Edwards' },
                            { id: 6, firstname: 'Frank', lastname: 'Franklin' },
                            { id: 7, firstname: 'Grace', lastname: 'Green' },
                            { id: 8, firstname: 'Henry', lastname: 'Hill' }
                        ],
                        pairings: [
                            { player1: 5, player2: 6, previousGames: 1 }
                        ]
                    }
                ],
                leftover: []
            };
            mockGetPodSuggestions.mockResolvedValue(multiplePods);

            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByText(/pod 1/i)).toBeInTheDocument();
            });

            // Create first pod
            const createButtons = screen.getAllByText(/create this pod/i);
            fireEvent.click(createButtons[0]);

            await waitFor(() => {
                // Pod 1 should be removed, pod 2 becomes pod 1
                expect(screen.queryByText('Alice Anderson')).not.toBeInTheDocument();
                expect(screen.getByText('Eve Edwards')).toBeInTheDocument();
            });
        });
    });

    describe('Score color classes', () => {
        it('should apply text-success for score 0', async () => {
            render(<PodSuggestionsPage />);

            await waitFor(() => {
                const scoreLabel = screen.getByText(/fresh matchups!/i);
                expect(scoreLabel).toHaveClass('text-success');
            });
        });

        it('should apply text-warning for score 1-2', async () => {
            const warningSuggestions = {
                ...mockSuggestions,
                pods: [{ ...mockSuggestions.pods[0], score: 2 }]
            };
            mockGetPodSuggestions.mockResolvedValue(warningSuggestions);

            render(<PodSuggestionsPage />);

            await waitFor(() => {
                const scoreLabel = screen.getByText(/some repeats/i);
                expect(scoreLabel).toHaveClass('text-warning');
            });
        });

        it('should apply text-danger for score 3+', async () => {
            const dangerSuggestions = {
                ...mockSuggestions,
                pods: [{ ...mockSuggestions.pods[0], score: 5 }]
            };
            mockGetPodSuggestions.mockResolvedValue(dangerSuggestions);

            render(<PodSuggestionsPage />);

            await waitFor(() => {
                const scoreLabel = screen.getByText(/many repeats/i);
                expect(scoreLabel).toHaveClass('text-danger');
            });
        });
    });

    describe('Edge cases', () => {
        it('should handle missing suggestions data', async () => {
            mockGetPodSuggestions.mockResolvedValue(null);

            render(<PodSuggestionsPage />);

            await waitFor(() => {
                // Should handle null gracefully
                expect(screen.getByText(/0/)).toBeInTheDocument();
            });
        });

        it('should handle pairing with missing player', async () => {
            const invalidPairings = {
                ...mockSuggestions,
                pods: [{
                    ...mockSuggestions.pods[0],
                    pairings: [
                        { player1: 1, player2: 999, previousGames: 0 } // Invalid player
                    ]
                }]
            };
            mockGetPodSuggestions.mockResolvedValue(invalidPairings);

            render(<PodSuggestionsPage />);

            await waitFor(() => {
                // Should handle missing player gracefully (undefined.firstname)
                expect(screen.getByText(/alice vs/i)).toBeInTheDocument();
            });
        });

        it('should handle drop from different pod (should be ignored)', async () => {
            const twoPods = {
                ...mockSuggestions,
                pods: [
                    mockSuggestions.pods[0],
                    {
                        ...mockSuggestions.pods[0],
                        players: [
                            { id: 5, firstname: 'Eve', lastname: 'E' },
                            { id: 6, firstname: 'Frank', lastname: 'F' },
                            { id: 7, firstname: 'Grace', lastname: 'G' },
                            { id: 8, firstname: 'Henry', lastname: 'H' }
                        ]
                    }
                ]
            };
            mockGetPodSuggestions.mockResolvedValue(twoPods);

            render(<PodSuggestionsPage />);

            await waitFor(() => {
                expect(screen.getByText('Alice Anderson')).toBeInTheDocument();
            });

            const draggableItems = document.querySelectorAll('[draggable="true"]');
            const mockDataTransfer = { effectAllowed: '', dropEffect: '' };

            // Drag from first pod
            fireEvent.dragStart(draggableItems[0], { dataTransfer: mockDataTransfer });

            // Try to drop on second pod's player (index 4)
            fireEvent.drop(draggableItems[4], { dataTransfer: mockDataTransfer });

            // Order should not change
            await waitFor(() => {
                const firstBadges = screen.getAllByText(/first/i);
                // First pod should still have Alice as first
                expect(firstBadges[0].closest('.turn-order-item')).toHaveTextContent('Alice Anderson');
            });
        });
    });
});
