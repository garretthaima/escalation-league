import {
    getPods,
    createPod,
    joinPod,
    logPodResult,
    updatePod,
    overridePod
} from '../podsApi';
import axiosInstance from '../axiosConfig';

// Mock axiosInstance
jest.mock('../axiosConfig', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn()
    }
}));

describe('podsApi', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getPods', () => {
        it('should fetch pods with no filter', async () => {
            const mockPods = [
                { id: 1, name: 'Pod 1' },
                { id: 2, name: 'Pod 2' }
            ];
            axiosInstance.get.mockResolvedValue({ data: mockPods });

            const result = await getPods();

            expect(axiosInstance.get).toHaveBeenCalledWith('/pods?');
            expect(axiosInstance.get).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockPods);
        });

        it('should fetch pods with filter parameters', async () => {
            const mockPods = [{ id: 1, name: 'Pod 1', status: 'active' }];
            axiosInstance.get.mockResolvedValue({ data: mockPods });

            const filter = { status: 'active', leagueId: '123' };
            const result = await getPods(filter);

            expect(axiosInstance.get).toHaveBeenCalledWith('/pods?status=active&leagueId=123');
            expect(axiosInstance.get).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockPods);
        });

        it('should fetch pods with empty filter object', async () => {
            const mockPods = [];
            axiosInstance.get.mockResolvedValue({ data: mockPods });

            const result = await getPods({});

            expect(axiosInstance.get).toHaveBeenCalledWith('/pods?');
            expect(axiosInstance.get).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockPods);
        });

        it('should propagate errors from axios', async () => {
            const error = new Error('Network error');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getPods()).rejects.toThrow('Network error');
            expect(axiosInstance.get).toHaveBeenCalledTimes(1);
        });
    });

    describe('createPod', () => {
        it('should create a pod with given data', async () => {
            const podData = { name: 'New Pod', maxPlayers: 4 };
            const createdPod = { id: 1, ...podData };
            axiosInstance.post.mockResolvedValue({ data: createdPod });

            const result = await createPod(podData);

            expect(axiosInstance.post).toHaveBeenCalledWith('/pods', podData);
            expect(axiosInstance.post).toHaveBeenCalledTimes(1);
            expect(result).toEqual(createdPod);
        });

        it('should create a pod with minimal data', async () => {
            const podData = { name: 'Minimal Pod' };
            const createdPod = { id: 2, name: 'Minimal Pod' };
            axiosInstance.post.mockResolvedValue({ data: createdPod });

            const result = await createPod(podData);

            expect(axiosInstance.post).toHaveBeenCalledWith('/pods', podData);
            expect(result).toEqual(createdPod);
        });

        it('should propagate errors from axios', async () => {
            const error = new Error('Validation error');
            axiosInstance.post.mockRejectedValue(error);

            await expect(createPod({ name: 'Bad Pod' })).rejects.toThrow('Validation error');
            expect(axiosInstance.post).toHaveBeenCalledTimes(1);
        });
    });

    describe('joinPod', () => {
        it('should join a pod by podId', async () => {
            const podId = 5;
            const responseData = { success: true, message: 'Joined pod' };
            axiosInstance.post.mockResolvedValue({ data: responseData });

            const result = await joinPod(podId);

            expect(axiosInstance.post).toHaveBeenCalledWith('/pods/5/join');
            expect(axiosInstance.post).toHaveBeenCalledTimes(1);
            expect(result).toEqual(responseData);
        });

        it('should handle string podId', async () => {
            const podId = '10';
            const responseData = { success: true };
            axiosInstance.post.mockResolvedValue({ data: responseData });

            const result = await joinPod(podId);

            expect(axiosInstance.post).toHaveBeenCalledWith('/pods/10/join');
            expect(result).toEqual(responseData);
        });

        it('should propagate errors from axios', async () => {
            const error = new Error('Pod is full');
            axiosInstance.post.mockRejectedValue(error);

            await expect(joinPod(1)).rejects.toThrow('Pod is full');
            expect(axiosInstance.post).toHaveBeenCalledTimes(1);
        });
    });

    describe('logPodResult', () => {
        it('should log pod result with given data', async () => {
            const podId = 3;
            const resultData = { winner: 'user1', scores: [10, 5, 3, 2] };
            const responseData = { success: true, pod: { id: 3, status: 'completed' } };
            axiosInstance.post.mockResolvedValue({ data: responseData });

            const result = await logPodResult(podId, resultData);

            expect(axiosInstance.post).toHaveBeenCalledWith('/pods/3/log', resultData);
            expect(axiosInstance.post).toHaveBeenCalledTimes(1);
            expect(result).toEqual(responseData);
        });

        it('should handle empty result data', async () => {
            const podId = 7;
            const resultData = {};
            const responseData = { success: true };
            axiosInstance.post.mockResolvedValue({ data: responseData });

            const result = await logPodResult(podId, resultData);

            expect(axiosInstance.post).toHaveBeenCalledWith('/pods/7/log', resultData);
            expect(result).toEqual(responseData);
        });

        it('should propagate errors from axios', async () => {
            const error = new Error('Invalid result data');
            axiosInstance.post.mockRejectedValue(error);

            await expect(logPodResult(1, { winner: 'invalid' })).rejects.toThrow('Invalid result data');
            expect(axiosInstance.post).toHaveBeenCalledTimes(1);
        });
    });

    describe('updatePod', () => {
        it('should update a pod with given updates', async () => {
            const podId = 4;
            const updates = { name: 'Updated Pod', status: 'active' };
            const updatedPod = { id: 4, ...updates };
            axiosInstance.put.mockResolvedValue({ data: updatedPod });

            const result = await updatePod(podId, updates);

            expect(axiosInstance.put).toHaveBeenCalledWith('/pods/4', updates);
            expect(axiosInstance.put).toHaveBeenCalledTimes(1);
            expect(result).toEqual(updatedPod);
        });

        it('should update a pod with partial updates', async () => {
            const podId = 8;
            const updates = { status: 'completed' };
            const updatedPod = { id: 8, name: 'Existing Pod', status: 'completed' };
            axiosInstance.put.mockResolvedValue({ data: updatedPod });

            const result = await updatePod(podId, updates);

            expect(axiosInstance.put).toHaveBeenCalledWith('/pods/8', updates);
            expect(result).toEqual(updatedPod);
        });

        it('should propagate errors from axios', async () => {
            const error = new Error('Pod not found');
            axiosInstance.put.mockRejectedValue(error);

            await expect(updatePod(999, { name: 'Update' })).rejects.toThrow('Pod not found');
            expect(axiosInstance.put).toHaveBeenCalledTimes(1);
        });
    });

    describe('overridePod', () => {
        it('should override a pod to active status', async () => {
            const podId = 6;
            const responseData = { success: true, pod: { id: 6, status: 'active' } };
            axiosInstance.post.mockResolvedValue({ data: responseData });

            const result = await overridePod(podId);

            expect(axiosInstance.post).toHaveBeenCalledWith('/pods/6/override');
            expect(axiosInstance.post).toHaveBeenCalledTimes(1);
            expect(result).toEqual(responseData);
        });

        it('should handle string podId', async () => {
            const podId = '12';
            const responseData = { success: true };
            axiosInstance.post.mockResolvedValue({ data: responseData });

            const result = await overridePod(podId);

            expect(axiosInstance.post).toHaveBeenCalledWith('/pods/12/override');
            expect(result).toEqual(responseData);
        });

        it('should propagate errors from axios', async () => {
            const error = new Error('Unauthorized');
            axiosInstance.post.mockRejectedValue(error);

            await expect(overridePod(1)).rejects.toThrow('Unauthorized');
            expect(axiosInstance.post).toHaveBeenCalledTimes(1);
        });
    });
});
