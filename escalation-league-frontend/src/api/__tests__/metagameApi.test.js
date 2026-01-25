// Mock axiosInstance BEFORE importing modules that use it
jest.mock('../axiosConfig', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
    },
}));

import axiosInstance from '../axiosConfig';
import {
    getMetagameAnalysis,
    getCardStats,
    getTurnOrderStats,
    getCategoryCards,
    getCommanderMatchups,
} from '../metagameApi';

describe('metagameApi', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getMetagameAnalysis', () => {
        it('should fetch metagame analysis successfully', async () => {
            const leagueId = 1;
            const mockAnalysis = {
                totalGames: 50,
                commanders: [
                    { name: 'Kenrith', wins: 10, games: 20 },
                    { name: 'Urza', wins: 8, games: 15 },
                ],
                topCards: ['Sol Ring', 'Command Tower'],
            };
            axiosInstance.get.mockResolvedValue({ data: mockAnalysis });

            const result = await getMetagameAnalysis(leagueId);

            expect(axiosInstance.get).toHaveBeenCalledWith('/leagues/1/metagame/analysis');
            expect(result).toEqual(mockAnalysis);
        });

        it('should propagate errors', async () => {
            const error = new Error('Failed to fetch analysis');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getMetagameAnalysis(999)).rejects.toThrow('Failed to fetch analysis');
        });
    });

    describe('getCardStats', () => {
        it('should fetch card statistics successfully', async () => {
            const leagueId = 1;
            const cardName = 'Sol Ring';
            const mockStats = {
                cardName: 'Sol Ring',
                appearances: 45,
                winRate: 0.52,
                decksUsing: 90,
            };
            axiosInstance.get.mockResolvedValue({ data: mockStats });

            const result = await getCardStats(leagueId, cardName);

            expect(axiosInstance.get).toHaveBeenCalledWith('/leagues/1/metagame/card/Sol%20Ring');
            expect(result).toEqual(mockStats);
        });

        it('should encode special characters in card name', async () => {
            const leagueId = 2;
            const cardName = "Sensei's Divining Top";
            const mockStats = {
                cardName: "Sensei's Divining Top",
                appearances: 20,
            };
            axiosInstance.get.mockResolvedValue({ data: mockStats });

            const result = await getCardStats(leagueId, cardName);

            expect(axiosInstance.get).toHaveBeenCalledWith(
                "/leagues/2/metagame/card/Sensei's%20Divining%20Top"
            );
            expect(result).toEqual(mockStats);
        });

        it('should propagate errors', async () => {
            const error = new Error('Card not found');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getCardStats(1, 'Invalid Card')).rejects.toThrow('Card not found');
        });
    });

    describe('getTurnOrderStats', () => {
        it('should fetch turn order statistics successfully', async () => {
            const leagueId = 1;
            const mockStats = {
                positions: [
                    { position: 1, winRate: 0.28 },
                    { position: 2, winRate: 0.26 },
                    { position: 3, winRate: 0.24 },
                    { position: 4, winRate: 0.22 },
                ],
                totalGames: 100,
            };
            axiosInstance.get.mockResolvedValue({ data: mockStats });

            const result = await getTurnOrderStats(leagueId);

            expect(axiosInstance.get).toHaveBeenCalledWith('/leagues/1/metagame/turn-order');
            expect(result).toEqual(mockStats);
        });

        it('should propagate errors', async () => {
            const error = new Error('Failed to fetch turn order stats');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getTurnOrderStats(999)).rejects.toThrow('Failed to fetch turn order stats');
        });
    });

    describe('getCategoryCards', () => {
        it('should fetch cards for ramp category', async () => {
            const leagueId = 1;
            const category = 'ramp';
            const mockCards = [
                { name: 'Sol Ring', count: 45 },
                { name: 'Cultivate', count: 30 },
            ];
            axiosInstance.get.mockResolvedValue({ data: mockCards });

            const result = await getCategoryCards(leagueId, category);

            expect(axiosInstance.get).toHaveBeenCalledWith('/leagues/1/metagame/category/ramp');
            expect(result).toEqual(mockCards);
        });

        it('should fetch cards for removal category', async () => {
            const leagueId = 1;
            const category = 'removal';
            const mockCards = [
                { name: 'Swords to Plowshares', count: 25 },
                { name: 'Path to Exile', count: 20 },
            ];
            axiosInstance.get.mockResolvedValue({ data: mockCards });

            const result = await getCategoryCards(leagueId, category);

            expect(axiosInstance.get).toHaveBeenCalledWith('/leagues/1/metagame/category/removal');
            expect(result).toEqual(mockCards);
        });

        it('should fetch cards for cardDraw category', async () => {
            const leagueId = 1;
            const category = 'cardDraw';
            const mockCards = [{ name: 'Rhystic Study', count: 15 }];
            axiosInstance.get.mockResolvedValue({ data: mockCards });

            const result = await getCategoryCards(leagueId, category);

            expect(axiosInstance.get).toHaveBeenCalledWith('/leagues/1/metagame/category/cardDraw');
            expect(result).toEqual(mockCards);
        });

        it('should fetch cards for counterspells category', async () => {
            const leagueId = 1;
            const category = 'counterspells';
            const mockCards = [{ name: 'Counterspell', count: 10 }];
            axiosInstance.get.mockResolvedValue({ data: mockCards });

            const result = await getCategoryCards(leagueId, category);

            expect(axiosInstance.get).toHaveBeenCalledWith(
                '/leagues/1/metagame/category/counterspells'
            );
            expect(result).toEqual(mockCards);
        });

        it('should fetch cards for boardWipes category', async () => {
            const leagueId = 1;
            const category = 'boardWipes';
            const mockCards = [{ name: 'Wrath of God', count: 8 }];
            axiosInstance.get.mockResolvedValue({ data: mockCards });

            const result = await getCategoryCards(leagueId, category);

            expect(axiosInstance.get).toHaveBeenCalledWith(
                '/leagues/1/metagame/category/boardWipes'
            );
            expect(result).toEqual(mockCards);
        });

        it('should propagate errors', async () => {
            const error = new Error('Invalid category');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getCategoryCards(1, 'invalid')).rejects.toThrow('Invalid category');
        });
    });

    describe('getCommanderMatchups', () => {
        it('should fetch commander matchup statistics successfully', async () => {
            const leagueId = 1;
            const mockMatchups = {
                matchups: [
                    {
                        commander1: 'Kenrith',
                        commander2: 'Urza',
                        commander1Wins: 5,
                        commander2Wins: 3,
                        games: 8,
                    },
                    {
                        commander1: 'Kenrith',
                        commander2: 'Tymna/Thrasios',
                        commander1Wins: 2,
                        commander2Wins: 4,
                        games: 6,
                    },
                ],
            };
            axiosInstance.get.mockResolvedValue({ data: mockMatchups });

            const result = await getCommanderMatchups(leagueId);

            expect(axiosInstance.get).toHaveBeenCalledWith(
                '/leagues/1/metagame/commander-matchups'
            );
            expect(result).toEqual(mockMatchups);
        });

        it('should propagate errors', async () => {
            const error = new Error('Failed to fetch matchups');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getCommanderMatchups(999)).rejects.toThrow('Failed to fetch matchups');
        });
    });
});
