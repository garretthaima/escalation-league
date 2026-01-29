// Mock ScryfallApi - MUST be before any imports
jest.mock('../../../../api/scryfallApi', () => ({
    __esModule: true,
    default: {
        getCardByName: jest.fn()
    }
}));

// Mock axiosConfig to prevent ESM issues
jest.mock('../../../../api/axiosConfig', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        interceptors: {
            request: { use: jest.fn() },
            response: { use: jest.fn() }
        }
    }
}));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import UserStandingCard from '../UserStandingCard';
import ScryfallApi from '../../../../api/scryfallApi';

// Wrapper component with Router
const renderWithRouter = (component) => {
    return render(
        <BrowserRouter>
            {component}
        </BrowserRouter>
    );
};

describe('UserStandingCard', () => {
    const mockUserStats = {
        total_points: 100,
        league_wins: 10,
        league_losses: 5,
        current_commander: 'Atraxa, Praetors\' Voice',
        commander_partner: null,
        decklist_url: 'https://moxfield.com/decks/123',
        rank: 3
    };

    const defaultProps = {
        userStats: mockUserStats,
        leagueId: 1,
        onUpdateCommander: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
        ScryfallApi.getCardByName.mockResolvedValue({
            name: 'Atraxa, Praetors\' Voice',
            image_uris: {
                art_crop: 'https://example.com/atraxa.jpg'
            }
        });
    });

    describe('rendering', () => {
        it('should render user standing card', () => {
            renderWithRouter(<UserStandingCard {...defaultProps} />);
            expect(screen.getByText('Your Standing')).toBeInTheDocument();
        });

        it('should return null when userStats is null', () => {
            const { container } = renderWithRouter(<UserStandingCard {...defaultProps} userStats={null} />);
            expect(container.firstChild).toBeNull();
        });

        it('should return null when userStats is undefined', () => {
            const { container } = renderWithRouter(<UserStandingCard {...defaultProps} userStats={undefined} />);
            expect(container.firstChild).toBeNull();
        });
    });

    describe('stats display', () => {
        it('should display total points', () => {
            renderWithRouter(<UserStandingCard {...defaultProps} />);
            expect(screen.getByText('100')).toBeInTheDocument();
            expect(screen.getByText('Points')).toBeInTheDocument();
        });

        it('should display wins', () => {
            renderWithRouter(<UserStandingCard {...defaultProps} />);
            expect(screen.getByText('10')).toBeInTheDocument();
            expect(screen.getByText('Wins')).toBeInTheDocument();
        });

        it('should display losses', () => {
            renderWithRouter(<UserStandingCard {...defaultProps} />);
            expect(screen.getByText('5')).toBeInTheDocument();
            expect(screen.getByText('Losses')).toBeInTheDocument();
        });

        it('should display win rate', () => {
            renderWithRouter(<UserStandingCard {...defaultProps} />);
            // 10 / (10 + 5) * 100 = 66.67%
            expect(screen.getByText('67%')).toBeInTheDocument();
            expect(screen.getByText('Win Rate')).toBeInTheDocument();
        });

        it('should show 0% win rate when no games played', () => {
            const statsNoGames = {
                ...mockUserStats,
                league_wins: 0,
                league_losses: 0
            };
            renderWithRouter(<UserStandingCard {...defaultProps} userStats={statsNoGames} />);
            expect(screen.getByText('0%')).toBeInTheDocument();
        });

        it('should show 0 for missing points', () => {
            const statsNoPoints = {
                ...mockUserStats,
                total_points: undefined
            };
            renderWithRouter(<UserStandingCard {...defaultProps} userStats={statsNoPoints} />);
            expect(screen.getAllByText('0').length).toBeGreaterThan(0);
        });

        it('should show 0 for missing wins', () => {
            const statsNoWins = {
                ...mockUserStats,
                league_wins: undefined
            };
            renderWithRouter(<UserStandingCard {...defaultProps} userStats={statsNoWins} />);
            expect(screen.getAllByText('0').length).toBeGreaterThan(0);
        });

        it('should show 0 for missing losses', () => {
            const statsNoLosses = {
                ...mockUserStats,
                league_losses: undefined
            };
            renderWithRouter(<UserStandingCard {...defaultProps} userStats={statsNoLosses} />);
            expect(screen.getAllByText('0').length).toBeGreaterThan(0);
        });
    });

    describe('rank display', () => {
        it('should display rank badge', () => {
            renderWithRouter(<UserStandingCard {...defaultProps} />);
            expect(screen.getByText('#3')).toBeInTheDocument();
        });

        it('should show warning badge for top 3 rank', () => {
            const { container } = renderWithRouter(<UserStandingCard {...defaultProps} />);
            const badge = container.querySelector('.badge.bg-warning');
            expect(badge).toBeInTheDocument();
        });

        it('should show secondary badge for rank > 3', () => {
            const statsRank4 = {
                ...mockUserStats,
                rank: 4
            };
            const { container } = renderWithRouter(<UserStandingCard {...defaultProps} userStats={statsRank4} />);
            const badge = container.querySelector('.badge.bg-secondary');
            expect(badge).toBeInTheDocument();
        });

        it('should not display rank badge when rank is not set', () => {
            const statsNoRank = {
                ...mockUserStats,
                rank: undefined
            };
            renderWithRouter(<UserStandingCard {...defaultProps} userStats={statsNoRank} />);
            expect(screen.queryByText(/#\d+/)).not.toBeInTheDocument();
        });
    });

    describe('commander display', () => {
        it('should display commander name', () => {
            renderWithRouter(<UserStandingCard {...defaultProps} />);
            expect(screen.getByText('Atraxa, Praetors\' Voice')).toBeInTheDocument();
        });

        it('should display "No commander set" when commander is null', () => {
            const statsNoCommander = {
                ...mockUserStats,
                current_commander: null
            };
            renderWithRouter(<UserStandingCard {...defaultProps} userStats={statsNoCommander} />);
            expect(screen.getByText('No commander set')).toBeInTheDocument();
        });

        it('should fetch commander card image', async () => {
            renderWithRouter(<UserStandingCard {...defaultProps} />);

            await waitFor(() => {
                expect(ScryfallApi.getCardByName).toHaveBeenCalledWith('Atraxa, Praetors\' Voice');
            });
        });

        it('should display commander image when fetched', async () => {
            renderWithRouter(<UserStandingCard {...defaultProps} />);

            await waitFor(() => {
                const img = screen.getByAltText('Atraxa, Praetors\' Voice');
                expect(img).toBeInTheDocument();
                expect(img).toHaveAttribute('src', 'https://example.com/atraxa.jpg');
            });
        });

        it('should display placeholder when commander image is not available', async () => {
            ScryfallApi.getCardByName.mockResolvedValue({
                name: 'Atraxa, Praetors\' Voice',
                image_uris: null
            });

            const { container } = renderWithRouter(<UserStandingCard {...defaultProps} />);

            await waitFor(() => {
                const placeholder = container.querySelector('.fa-hat-wizard');
                expect(placeholder).toBeInTheDocument();
            });
        });

        it('should handle API error when fetching commander', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            ScryfallApi.getCardByName.mockRejectedValue(new Error('API Error'));

            renderWithRouter(<UserStandingCard {...defaultProps} />);

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith('Error fetching commander:', expect.any(Error));
            });

            consoleSpy.mockRestore();
        });
    });

    describe('partner commander', () => {
        const statsWithPartner = {
            ...mockUserStats,
            current_commander: 'Thrasios, Triton Hero',
            commander_partner: 'Tymna the Weaver'
        };

        beforeEach(() => {
            ScryfallApi.getCardByName
                .mockResolvedValueOnce({
                    name: 'Thrasios, Triton Hero',
                    image_uris: { art_crop: 'https://example.com/thrasios.jpg' }
                })
                .mockResolvedValueOnce({
                    name: 'Tymna the Weaver',
                    image_uris: { art_crop: 'https://example.com/tymna.jpg' }
                });
        });

        it('should display partner commander name', () => {
            renderWithRouter(<UserStandingCard {...defaultProps} userStats={statsWithPartner} />);
            expect(screen.getByText(/\+ Tymna the Weaver/)).toBeInTheDocument();
        });

        it('should fetch partner commander card image', async () => {
            renderWithRouter(<UserStandingCard {...defaultProps} userStats={statsWithPartner} />);

            await waitFor(() => {
                expect(ScryfallApi.getCardByName).toHaveBeenCalledWith('Tymna the Weaver');
            });
        });

        it('should display partner commander image when fetched', async () => {
            renderWithRouter(<UserStandingCard {...defaultProps} userStats={statsWithPartner} />);

            await waitFor(() => {
                const img = screen.getByAltText('Tymna the Weaver');
                expect(img).toBeInTheDocument();
                expect(img).toHaveAttribute('src', 'https://example.com/tymna.jpg');
            });
        });

        it('should handle partner API error gracefully', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            // Reset the mock from beforeEach and set up new behavior
            ScryfallApi.getCardByName.mockReset();
            ScryfallApi.getCardByName
                .mockResolvedValueOnce({
                    name: 'Thrasios, Triton Hero',
                    image_uris: { art_crop: 'https://example.com/thrasios.jpg' }
                })
                .mockRejectedValueOnce(new Error('Partner API Error'));

            renderWithRouter(<UserStandingCard {...defaultProps} userStats={statsWithPartner} />);

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith('Error fetching partner:', expect.any(Error));
            });

            consoleSpy.mockRestore();
        });
    });

    describe('update commander button', () => {
        it('should render Update Commander button', () => {
            renderWithRouter(<UserStandingCard {...defaultProps} />);
            expect(screen.getByRole('button', { name: /Update Commander/i })).toBeInTheDocument();
        });

        it('should call onUpdateCommander when button is clicked', () => {
            renderWithRouter(<UserStandingCard {...defaultProps} />);
            const button = screen.getByRole('button', { name: /Update Commander/i });

            fireEvent.click(button);

            expect(defaultProps.onUpdateCommander).toHaveBeenCalledTimes(1);
        });

        it('should have edit icon on button', () => {
            const { container } = renderWithRouter(<UserStandingCard {...defaultProps} />);
            const editIcon = container.querySelector('.fa-edit');
            expect(editIcon).toBeInTheDocument();
        });
    });

    describe('decklist link', () => {
        it('should render View Decklist link when decklist_url exists', () => {
            renderWithRouter(<UserStandingCard {...defaultProps} />);
            const link = screen.getByRole('link', { name: /View Decklist/i });
            expect(link).toBeInTheDocument();
            expect(link).toHaveAttribute('href', 'https://moxfield.com/decks/123');
            expect(link).toHaveAttribute('target', '_blank');
            expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        });

        it('should not render View Decklist link when decklist_url is null', () => {
            const statsNoDeck = {
                ...mockUserStats,
                decklist_url: null
            };
            renderWithRouter(<UserStandingCard {...defaultProps} userStats={statsNoDeck} />);
            expect(screen.queryByRole('link', { name: /View Decklist/i })).not.toBeInTheDocument();
        });

        it('should have external link icon', () => {
            const { container } = renderWithRouter(<UserStandingCard {...defaultProps} />);
            const externalIcon = container.querySelector('.fa-external-link-alt');
            expect(externalIcon).toBeInTheDocument();
        });
    });

    describe('price check link', () => {
        it('should render Price Check link', () => {
            renderWithRouter(<UserStandingCard {...defaultProps} />);
            const link = screen.getByRole('link', { name: /Price Check/i });
            expect(link).toBeInTheDocument();
            expect(link).toHaveAttribute('href', '/leagues/price-check');
        });

        it('should have dollar icon', () => {
            const { container } = renderWithRouter(<UserStandingCard {...defaultProps} />);
            const dollarIcon = container.querySelector('.fa-dollar-sign');
            expect(dollarIcon).toBeInTheDocument();
        });
    });

    describe('card styling', () => {
        it('should have border-primary class on card', () => {
            const { container } = renderWithRouter(<UserStandingCard {...defaultProps} />);
            expect(container.querySelector('.card.border-primary')).toBeInTheDocument();
        });

        it('should have card-body class', () => {
            const { container } = renderWithRouter(<UserStandingCard {...defaultProps} />);
            expect(container.querySelector('.card-body')).toBeInTheDocument();
        });
    });

    describe('stat box styling', () => {
        it('should have primary styling for points', () => {
            const { container } = renderWithRouter(<UserStandingCard {...defaultProps} />);
            expect(container.querySelector('.bg-primary.bg-opacity-10')).toBeInTheDocument();
            expect(container.querySelector('.text-primary')).toBeInTheDocument();
        });

        it('should have success styling for wins', () => {
            const { container } = renderWithRouter(<UserStandingCard {...defaultProps} />);
            expect(container.querySelector('.bg-success.bg-opacity-10')).toBeInTheDocument();
            expect(container.querySelector('.text-success')).toBeInTheDocument();
        });

        it('should have danger styling for losses', () => {
            const { container } = renderWithRouter(<UserStandingCard {...defaultProps} />);
            expect(container.querySelector('.bg-danger.bg-opacity-10')).toBeInTheDocument();
            expect(container.querySelector('.text-danger')).toBeInTheDocument();
        });

        it('should have info styling for win rate', () => {
            const { container } = renderWithRouter(<UserStandingCard {...defaultProps} />);
            expect(container.querySelector('.bg-info.bg-opacity-10')).toBeInTheDocument();
            expect(container.querySelector('.text-info')).toBeInTheDocument();
        });
    });

    describe('win rate calculation', () => {
        it('should calculate win rate correctly with 100% wins', () => {
            const stats100Percent = {
                ...mockUserStats,
                league_wins: 10,
                league_losses: 0
            };
            renderWithRouter(<UserStandingCard {...defaultProps} userStats={stats100Percent} />);
            expect(screen.getByText('100%')).toBeInTheDocument();
        });

        it('should calculate win rate correctly with 0% wins', () => {
            const stats0Percent = {
                ...mockUserStats,
                league_wins: 0,
                league_losses: 10
            };
            renderWithRouter(<UserStandingCard {...defaultProps} userStats={stats0Percent} />);
            expect(screen.getByText('0%')).toBeInTheDocument();
        });

        it('should calculate win rate correctly with 50% wins', () => {
            const stats50Percent = {
                ...mockUserStats,
                league_wins: 5,
                league_losses: 5
            };
            renderWithRouter(<UserStandingCard {...defaultProps} userStats={stats50Percent} />);
            expect(screen.getByText('50%')).toBeInTheDocument();
        });
    });

    describe('commander image classes', () => {
        it('should have commander-placeholder class when no partner', async () => {
            const { container } = renderWithRouter(<UserStandingCard {...defaultProps} />);

            await waitFor(() => {
                const img = screen.getByAltText('Atraxa, Praetors\' Voice');
                expect(img).toHaveClass('commander-placeholder');
            });
        });

        it('should have commander-partner-image class when partner exists', async () => {
            const statsWithPartner = {
                ...mockUserStats,
                current_commander: 'Thrasios, Triton Hero',
                commander_partner: 'Tymna the Weaver'
            };

            ScryfallApi.getCardByName
                .mockResolvedValueOnce({
                    name: 'Thrasios, Triton Hero',
                    image_uris: { art_crop: 'https://example.com/thrasios.jpg' }
                })
                .mockResolvedValueOnce({
                    name: 'Tymna the Weaver',
                    image_uris: { art_crop: 'https://example.com/tymna.jpg' }
                });

            const { container } = renderWithRouter(<UserStandingCard {...defaultProps} userStats={statsWithPartner} />);

            await waitFor(() => {
                const partnerImg = screen.getByAltText('Tymna the Weaver');
                expect(partnerImg).toHaveClass('commander-partner-image');
            });
        });
    });
});
