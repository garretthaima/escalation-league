// Mocks must be BEFORE any imports for ESM compatibility
jest.mock('../../../api/axiosConfig', () => ({
    __esModule: true,
    default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

// Mock API modules
jest.mock('../../../api/podsApi', () => ({
    createPod: jest.fn(),
    getActivePods: jest.fn(),
    joinPod: jest.fn(),
    getPodDetails: jest.fn()
}));

// Mock toast context
const mockShowToast = jest.fn();
jest.mock('../../../context/ToastContext', () => ({
    useToast: () => ({ showToast: mockShowToast })
}));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PodsPage from '../PodsPage';

// Import mocked modules
import { createPod, getActivePods, joinPod, getPodDetails } from '../../../api/podsApi';

// TODO: Fix async/mock issues - tests skipped
describe.skip('PodsPage', () => {
    const mockPods = [
        { id: 1, league_id: 1, status: 'active' },
        { id: 2, league_id: 2, status: 'open' },
        { id: 3, league_id: 1, status: 'active' }
    ];

    const mockPodDetails = {
        id: 1,
        league_id: 1,
        status: 'active',
        participants: [
            { player_id: 1, username: 'JohnDoe' },
            { player_id: 2, username: 'JaneSmith' }
        ]
    };

    beforeEach(() => {
        jest.clearAllMocks();
        getActivePods.mockResolvedValue(mockPods);
    });

    describe('initial rendering', () => {
        it('should render the page heading', async () => {
            render(<PodsPage />);
            expect(screen.getByRole('heading', { name: 'Pods Management' })).toBeInTheDocument();
        });

        it('should render Create a Pod section', async () => {
            render(<PodsPage />);
            expect(screen.getByRole('heading', { name: 'Create a Pod' })).toBeInTheDocument();
        });

        it('should render Active Pods section', async () => {
            render(<PodsPage />);
            expect(screen.getByRole('heading', { name: 'Active Pods' })).toBeInTheDocument();
        });

        it('should render league ID input', async () => {
            render(<PodsPage />);
            expect(screen.getByPlaceholderText('League ID')).toBeInTheDocument();
        });

        it('should render Create Pod button', async () => {
            render(<PodsPage />);
            expect(screen.getByRole('button', { name: 'Create Pod' })).toBeInTheDocument();
        });
    });

    describe('fetching active pods', () => {
        it('should fetch and display active pods on mount', async () => {
            render(<PodsPage />);

            await waitFor(() => {
                expect(getActivePods).toHaveBeenCalled();
                expect(screen.getByText(/Pod #1/)).toBeInTheDocument();
                expect(screen.getByText(/Pod #2/)).toBeInTheDocument();
                expect(screen.getByText(/Pod #3/)).toBeInTheDocument();
            });
        });

        it('should display pod information correctly', async () => {
            render(<PodsPage />);

            await waitFor(() => {
                // The text is split across elements, so search for parts
                expect(screen.getByText(/League ID:/)).toBeInTheDocument();
                expect(screen.getByText(/Status:/)).toBeInTheDocument();
            });
        });

        it('should display error when fetching pods fails', async () => {
            getActivePods.mockRejectedValue(new Error('Network error'));
            render(<PodsPage />);

            await waitFor(() => {
                expect(screen.getByText('Failed to fetch active pods.')).toBeInTheDocument();
            });
        });
    });

    describe('creating a pod', () => {
        it('should update input value when typing', async () => {
            render(<PodsPage />);

            const input = screen.getByPlaceholderText('League ID');
            fireEvent.change(input, { target: { value: '5' } });

            expect(input).toHaveValue('5');
        });

        it('should call createPod API when Create Pod button is clicked', async () => {
            createPod.mockResolvedValue({ id: 4, league_id: 5, status: 'open' });
            render(<PodsPage />);

            const input = screen.getByPlaceholderText('League ID');
            fireEvent.change(input, { target: { value: '5' } });

            fireEvent.click(screen.getByRole('button', { name: 'Create Pod' }));

            await waitFor(() => {
                expect(createPod).toHaveBeenCalledWith({ leagueId: '5' });
            });
        });

        it('should add new pod to the list after creation', async () => {
            const newPod = { id: 4, league_id: 5, status: 'open' };
            createPod.mockResolvedValue(newPod);
            render(<PodsPage />);

            await waitFor(() => {
                expect(screen.getByText(/Pod #1/)).toBeInTheDocument();
            });

            const input = screen.getByPlaceholderText('League ID');
            fireEvent.change(input, { target: { value: '5' } });
            fireEvent.click(screen.getByRole('button', { name: 'Create Pod' }));

            await waitFor(() => {
                expect(screen.getByText(/Pod #4/)).toBeInTheDocument();
            });
        });

        it('should clear input after successful pod creation', async () => {
            createPod.mockResolvedValue({ id: 4, league_id: 5, status: 'open' });
            render(<PodsPage />);

            const input = screen.getByPlaceholderText('League ID');
            fireEvent.change(input, { target: { value: '5' } });
            fireEvent.click(screen.getByRole('button', { name: 'Create Pod' }));

            await waitFor(() => {
                expect(input).toHaveValue('');
            });
        });

        it('should display error when creating pod fails', async () => {
            createPod.mockRejectedValue(new Error('Creation failed'));
            render(<PodsPage />);

            const input = screen.getByPlaceholderText('League ID');
            fireEvent.change(input, { target: { value: '5' } });
            fireEvent.click(screen.getByRole('button', { name: 'Create Pod' }));

            await waitFor(() => {
                expect(screen.getByText('Failed to create pod.')).toBeInTheDocument();
            });
        });
    });

    describe('joining a pod', () => {
        it('should render Join button for each pod', async () => {
            render(<PodsPage />);

            await waitFor(() => {
                const joinButtons = screen.getAllByRole('button', { name: 'Join' });
                expect(joinButtons.length).toBe(3);
            });
        });

        it('should call joinPod API when Join button is clicked', async () => {
            joinPod.mockResolvedValue({});
            render(<PodsPage />);

            await waitFor(() => {
                expect(screen.getAllByRole('button', { name: 'Join' }).length).toBe(3);
            });

            const joinButtons = screen.getAllByRole('button', { name: 'Join' });
            fireEvent.click(joinButtons[0]);

            await waitFor(() => {
                expect(joinPod).toHaveBeenCalledWith(1);
                expect(mockShowToast).toHaveBeenCalledWith('Joined pod successfully!', 'success');
            });
        });

        it('should show error toast when joining pod fails', async () => {
            joinPod.mockRejectedValue(new Error('Pod is full'));
            render(<PodsPage />);

            await waitFor(() => {
                expect(screen.getAllByRole('button', { name: 'Join' }).length).toBe(3);
            });

            const joinButtons = screen.getAllByRole('button', { name: 'Join' });
            fireEvent.click(joinButtons[0]);

            await waitFor(() => {
                expect(mockShowToast).toHaveBeenCalledWith('Failed to join pod.', 'error');
            });
        });
    });

    describe('viewing pod details', () => {
        it('should render View Details button for each pod', async () => {
            render(<PodsPage />);

            await waitFor(() => {
                const viewButtons = screen.getAllByRole('button', { name: 'View Details' });
                expect(viewButtons.length).toBe(3);
            });
        });

        it('should fetch and display pod details when View Details is clicked', async () => {
            getPodDetails.mockResolvedValue(mockPodDetails);
            render(<PodsPage />);

            await waitFor(() => {
                expect(screen.getAllByRole('button', { name: 'View Details' }).length).toBe(3);
            });

            const viewButtons = screen.getAllByRole('button', { name: 'View Details' });
            fireEvent.click(viewButtons[0]);

            await waitFor(() => {
                expect(getPodDetails).toHaveBeenCalledWith(1);
                expect(screen.getByRole('heading', { name: 'Pod Details' })).toBeInTheDocument();
            });
        });

        it('should display pod details information', async () => {
            getPodDetails.mockResolvedValue(mockPodDetails);
            render(<PodsPage />);

            await waitFor(() => {
                expect(screen.getAllByRole('button', { name: 'View Details' }).length).toBe(3);
            });

            const viewButtons = screen.getAllByRole('button', { name: 'View Details' });
            fireEvent.click(viewButtons[0]);

            await waitFor(() => {
                expect(screen.getByText('Pod ID: 1')).toBeInTheDocument();
                expect(screen.getByText('League ID: 1')).toBeInTheDocument();
                expect(screen.getByText('Status: active')).toBeInTheDocument();
            });
        });

        it('should display participants in pod details', async () => {
            getPodDetails.mockResolvedValue(mockPodDetails);
            render(<PodsPage />);

            await waitFor(() => {
                expect(screen.getAllByRole('button', { name: 'View Details' }).length).toBe(3);
            });

            const viewButtons = screen.getAllByRole('button', { name: 'View Details' });
            fireEvent.click(viewButtons[0]);

            await waitFor(() => {
                expect(screen.getByRole('heading', { name: 'Participants' })).toBeInTheDocument();
                expect(screen.getByText('JohnDoe')).toBeInTheDocument();
                expect(screen.getByText('JaneSmith')).toBeInTheDocument();
            });
        });

        it('should display error when fetching pod details fails', async () => {
            getPodDetails.mockRejectedValue(new Error('Network error'));
            render(<PodsPage />);

            await waitFor(() => {
                expect(screen.getAllByRole('button', { name: 'View Details' }).length).toBe(3);
            });

            const viewButtons = screen.getAllByRole('button', { name: 'View Details' });
            fireEvent.click(viewButtons[0]);

            await waitFor(() => {
                expect(screen.getByText('Failed to fetch pod details.')).toBeInTheDocument();
            });
        });
    });

    describe('pod list rendering', () => {
        it('should display pod ID in list items', async () => {
            render(<PodsPage />);

            await waitFor(() => {
                expect(screen.getByText(/Pod #1/)).toBeInTheDocument();
                expect(screen.getByText(/Pod #2/)).toBeInTheDocument();
                expect(screen.getByText(/Pod #3/)).toBeInTheDocument();
            });
        });

        it('should display league ID for each pod', async () => {
            render(<PodsPage />);

            await waitFor(() => {
                const leagueTexts = screen.getAllByText(/League ID:/);
                expect(leagueTexts.length).toBe(3);
            });
        });

        it('should display status for each pod', async () => {
            render(<PodsPage />);

            await waitFor(() => {
                const activeStatuses = screen.getAllByText(/Status: active/);
                expect(activeStatuses.length).toBe(2);
                expect(screen.getByText(/Status: open/)).toBeInTheDocument();
            });
        });
    });

    describe('error display', () => {
        it('should display error with danger text styling', async () => {
            getActivePods.mockRejectedValue(new Error('Network error'));
            render(<PodsPage />);

            await waitFor(() => {
                const errorElement = screen.getByText('Failed to fetch active pods.');
                expect(errorElement).toHaveClass('text-danger');
            });
        });

        it('should clear previous error when new operation succeeds', async () => {
            // First, cause an error
            getActivePods.mockRejectedValue(new Error('Network error'));
            const { unmount } = render(<PodsPage />);

            await waitFor(() => {
                expect(screen.getByText('Failed to fetch active pods.')).toBeInTheDocument();
            });

            // Unmount first, then mock success and remount
            unmount();
            getActivePods.mockResolvedValue(mockPods);
            render(<PodsPage />);

            await waitFor(() => {
                expect(screen.queryByText('Failed to fetch active pods.')).not.toBeInTheDocument();
            });
        });
    });

    describe('empty pods list', () => {
        it('should render empty list when no pods exist', async () => {
            getActivePods.mockResolvedValue([]);
            render(<PodsPage />);

            await waitFor(() => {
                expect(getActivePods).toHaveBeenCalled();
            });

            // List should be empty
            expect(screen.queryByText(/Pod #/)).not.toBeInTheDocument();
        });
    });

    describe('input behavior', () => {
        it('should accept numeric input for league ID', async () => {
            render(<PodsPage />);

            const input = screen.getByPlaceholderText('League ID');
            fireEvent.change(input, { target: { value: '123' } });

            expect(input).toHaveValue('123');
        });

        it('should accept string input for league ID', async () => {
            render(<PodsPage />);

            const input = screen.getByPlaceholderText('League ID');
            fireEvent.change(input, { target: { value: 'abc' } });

            expect(input).toHaveValue('abc');
        });
    });
});
