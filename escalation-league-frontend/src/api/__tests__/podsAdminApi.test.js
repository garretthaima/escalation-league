// Mock axiosInstance BEFORE importing modules that use it
jest.mock('../axiosConfig', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
    },
}));

import axiosInstance from '../axiosConfig';
import {
    updatePod,
    removeParticipant,
    addParticipant,
    updateParticipantResult,
    toggleDQ,
    deletePod,
} from '../podsAdminApi';

describe('podsAdminApi', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('updatePod', () => {
        it('should update a pod successfully', async () => {
            const podId = 1;
            const updates = { status: 'completed', date: '2025-01-15' };
            const mockResponse = {
                id: 1,
                status: 'completed',
                date: '2025-01-15',
            };
            axiosInstance.put.mockResolvedValue({ data: mockResponse });

            const result = await updatePod(podId, updates);

            expect(axiosInstance.put).toHaveBeenCalledWith('/admin/pods/1', updates);
            expect(result).toEqual(mockResponse);
        });

        it('should update pod with partial data', async () => {
            const podId = 2;
            const updates = { status: 'in_progress' };
            const mockResponse = { id: 2, status: 'in_progress' };
            axiosInstance.put.mockResolvedValue({ data: mockResponse });

            const result = await updatePod(podId, updates);

            expect(axiosInstance.put).toHaveBeenCalledWith('/admin/pods/2', updates);
            expect(result).toEqual(mockResponse);
        });

        it('should propagate errors', async () => {
            const error = new Error('Pod not found');
            axiosInstance.put.mockRejectedValue(error);

            await expect(updatePod(999, {})).rejects.toThrow('Pod not found');
        });
    });

    describe('removeParticipant', () => {
        it('should remove a participant from a pod', async () => {
            const podId = 1;
            const playerId = 100;
            const mockResponse = { message: 'Participant removed' };
            axiosInstance.delete.mockResolvedValue({ data: mockResponse });

            const result = await removeParticipant(podId, playerId);

            expect(axiosInstance.delete).toHaveBeenCalledWith('/admin/pods/1/participants/100');
            expect(result).toEqual(mockResponse);
        });

        it('should propagate errors', async () => {
            const error = new Error('Participant not found');
            axiosInstance.delete.mockRejectedValue(error);

            await expect(removeParticipant(1, 999)).rejects.toThrow('Participant not found');
        });
    });

    describe('addParticipant', () => {
        it('should add a participant to a pod', async () => {
            const podId = 1;
            const playerId = 200;
            const mockResponse = {
                podId: 1,
                playerId: 200,
                turnOrder: 4,
            };
            axiosInstance.post.mockResolvedValue({ data: mockResponse });

            const result = await addParticipant(podId, playerId);

            expect(axiosInstance.post).toHaveBeenCalledWith('/admin/pods/1/participants', {
                playerId: 200,
            });
            expect(result).toEqual(mockResponse);
        });

        it('should propagate errors', async () => {
            const error = new Error('Pod is full');
            axiosInstance.post.mockRejectedValue(error);

            await expect(addParticipant(1, 200)).rejects.toThrow('Pod is full');
        });
    });

    describe('updateParticipantResult', () => {
        it('should update participant result to win', async () => {
            const podId = 1;
            const playerId = 100;
            const result = 'win';
            const mockResponse = {
                podId: 1,
                playerId: 100,
                result: 'win',
            };
            axiosInstance.put.mockResolvedValue({ data: mockResponse });

            const apiResult = await updateParticipantResult(podId, playerId, result);

            expect(axiosInstance.put).toHaveBeenCalledWith('/admin/pods/1/participants/100', {
                result: 'win',
            });
            expect(apiResult).toEqual(mockResponse);
        });

        it('should update participant result to loss', async () => {
            const podId = 2;
            const playerId = 101;
            const result = 'loss';
            const mockResponse = {
                podId: 2,
                playerId: 101,
                result: 'loss',
            };
            axiosInstance.put.mockResolvedValue({ data: mockResponse });

            const apiResult = await updateParticipantResult(podId, playerId, result);

            expect(axiosInstance.put).toHaveBeenCalledWith('/admin/pods/2/participants/101', {
                result: 'loss',
            });
            expect(apiResult).toEqual(mockResponse);
        });

        it('should propagate errors', async () => {
            const error = new Error('Invalid result');
            axiosInstance.put.mockRejectedValue(error);

            await expect(updateParticipantResult(1, 100, 'invalid')).rejects.toThrow(
                'Invalid result'
            );
        });
    });

    describe('toggleDQ', () => {
        it('should toggle DQ status for a participant', async () => {
            const podId = 1;
            const playerId = 100;
            const mockResponse = {
                podId: 1,
                playerId: 100,
                disqualified: true,
            };
            axiosInstance.patch.mockResolvedValue({ data: mockResponse });

            const result = await toggleDQ(podId, playerId);

            expect(axiosInstance.patch).toHaveBeenCalledWith('/admin/pods/1/participants/100/dq');
            expect(result).toEqual(mockResponse);
        });

        it('should toggle DQ off', async () => {
            const podId = 2;
            const playerId = 101;
            const mockResponse = {
                podId: 2,
                playerId: 101,
                disqualified: false,
            };
            axiosInstance.patch.mockResolvedValue({ data: mockResponse });

            const result = await toggleDQ(podId, playerId);

            expect(result).toEqual(mockResponse);
        });

        it('should propagate errors', async () => {
            const error = new Error('Failed to toggle DQ');
            axiosInstance.patch.mockRejectedValue(error);

            await expect(toggleDQ(1, 100)).rejects.toThrow('Failed to toggle DQ');
        });
    });

    describe('deletePod', () => {
        it('should delete a pod successfully', async () => {
            const podId = 1;
            const mockResponse = { message: 'Pod deleted' };
            axiosInstance.delete.mockResolvedValue({ data: mockResponse });

            const result = await deletePod(podId);

            expect(axiosInstance.delete).toHaveBeenCalledWith('/admin/pods/1');
            expect(result).toEqual(mockResponse);
        });

        it('should propagate errors', async () => {
            const error = new Error('Pod not found');
            axiosInstance.delete.mockRejectedValue(error);

            await expect(deletePod(999)).rejects.toThrow('Pod not found');
        });
    });
});
