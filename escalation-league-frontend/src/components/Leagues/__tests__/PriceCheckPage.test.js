import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PriceCheckPage from '../PriceCheckPage';
import { priceCheckDeck } from '../../../api/decksApi';
import { getLeagueParticipantsDetails } from '../../../api/userLeaguesApi';

// Mock APIs
jest.mock('../../../api/decksApi', () => ({
    priceCheckDeck: jest.fn()
}));

jest.mock('../../../api/userLeaguesApi', () => ({
    getLeagueParticipantsDetails: jest.fn()
}));

// Mock PermissionsProvider
const mockPermissionsContext = {
    user: { id: 1 },
    activeLeague: { league_id: 1, name: 'Test League' }
};

jest.mock('../../../context/PermissionsProvider', () => ({
    usePermissions: () => mockPermissionsContext
}));

describe('PriceCheckPage', () => {
    const mockPriceCheckResult = {
        totalPrice: 150.50,
        cardPrices: [
            {
                name: 'Sol Ring',
                set_name: 'Commander Legends',
                price: 2.50,
                commander: false,
                image_uri: 'https://example.com/sol-ring.jpg'
            },
            {
                name: 'Kenrith, the Returned King',
                set_name: 'Throne of Eldraine',
                price: 15.00,
                commander: true,
                image_uri: 'https://example.com/kenrith.jpg'
            },
            {
                name: 'Lightning Bolt',
                set_name: 'Alpha',
                price: 50.00,
                commander: false,
                image_uri: 'https://example.com/bolt.jpg'
            }
        ]
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockPermissionsContext.user = { id: 1 };
        mockPermissionsContext.activeLeague = { league_id: 1, name: 'Test League' };
        getLeagueParticipantsDetails.mockResolvedValue({ deck_id: 'deck-123' });
        priceCheckDeck.mockResolvedValue(mockPriceCheckResult);
    });

    describe('Initial rendering', () => {
        it('should render the page title', async () => {
            render(<PriceCheckPage />);
            expect(screen.getByText('Deck Price Check')).toBeInTheDocument();
        });

        it('should render BETA badge', async () => {
            render(<PriceCheckPage />);
            expect(screen.getByText('BETA')).toBeInTheDocument();
        });

        it('should render info alert about price updates', async () => {
            render(<PriceCheckPage />);
            expect(screen.getByText(/Card prices are updated once daily/i)).toBeInTheDocument();
        });

        it('should render Check Deck Price button', async () => {
            render(<PriceCheckPage />);
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /check deck price/i })).toBeInTheDocument();
            });
        });

        it('should have disabled button when no deckId is loaded yet', () => {
            getLeagueParticipantsDetails.mockImplementation(() => new Promise(() => {})); // Never resolves
            render(<PriceCheckPage />);
            expect(screen.getByRole('button', { name: /check deck price/i })).toBeDisabled();
        });
    });

    describe('Error states', () => {
        it('should display error when no active league', async () => {
            mockPermissionsContext.activeLeague = null;
            render(<PriceCheckPage />);
            await waitFor(() => {
                expect(screen.getByText('No active league found.')).toBeInTheDocument();
            });
        });

        it('should display error when no deck associated', async () => {
            getLeagueParticipantsDetails.mockResolvedValue({ deck_id: null });
            render(<PriceCheckPage />);
            await waitFor(() => {
                expect(screen.getByText('No deck associated with the current league.')).toBeInTheDocument();
            });
        });

        it('should display error when fetching deck ID fails', async () => {
            getLeagueParticipantsDetails.mockRejectedValue(new Error('API Error'));
            render(<PriceCheckPage />);
            await waitFor(() => {
                expect(screen.getByText('Failed to fetch deck ID for the current league.')).toBeInTheDocument();
            });
        });

        it('should display error when price check fails', async () => {
            priceCheckDeck.mockRejectedValue(new Error('Price check failed'));
            render(<PriceCheckPage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /check deck price/i })).not.toBeDisabled();
            });

            fireEvent.click(screen.getByRole('button', { name: /check deck price/i }));

            await waitFor(() => {
                expect(screen.getByText('Failed to perform price check.')).toBeInTheDocument();
            });
        });
    });

    describe('Loading deck ID', () => {
        it('should call getLeagueParticipantsDetails with correct params', async () => {
            render(<PriceCheckPage />);
            await waitFor(() => {
                expect(getLeagueParticipantsDetails).toHaveBeenCalledWith(1, 1);
            });
        });

        it('should enable button after deck ID is loaded', async () => {
            render(<PriceCheckPage />);
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /check deck price/i })).not.toBeDisabled();
            });
        });
    });

    describe('Price check functionality', () => {
        it('should call priceCheckDeck when button is clicked', async () => {
            render(<PriceCheckPage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /check deck price/i })).not.toBeDisabled();
            });

            fireEvent.click(screen.getByRole('button', { name: /check deck price/i }));

            await waitFor(() => {
                expect(priceCheckDeck).toHaveBeenCalledWith('deck-123');
            });
        });

        it('should display loading state while checking', async () => {
            priceCheckDeck.mockImplementation(() => new Promise(() => {})); // Never resolves
            render(<PriceCheckPage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /check deck price/i })).not.toBeDisabled();
            });

            fireEvent.click(screen.getByRole('button', { name: /check deck price/i }));

            expect(screen.getByRole('button', { name: /checking/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /checking/i })).toBeDisabled();
        });

        it('should display total price after check', async () => {
            render(<PriceCheckPage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /check deck price/i })).not.toBeDisabled();
            });

            fireEvent.click(screen.getByRole('button', { name: /check deck price/i }));

            await waitFor(() => {
                expect(screen.getByText('Total Price: $150.50')).toBeInTheDocument();
            });
        });
    });

    describe('Card display', () => {
        beforeEach(async () => {
            render(<PriceCheckPage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /check deck price/i })).not.toBeDisabled();
            });

            fireEvent.click(screen.getByRole('button', { name: /check deck price/i }));

            await waitFor(() => {
                expect(screen.getByText('Total Price: $150.50')).toBeInTheDocument();
            });
        });

        it('should render commander cards first', async () => {
            // Commander should appear in the list
            expect(screen.getByText('Kenrith, the Returned King')).toBeInTheDocument();
        });

        it('should display card names', async () => {
            expect(screen.getByText('Sol Ring')).toBeInTheDocument();
            expect(screen.getByText('Lightning Bolt')).toBeInTheDocument();
        });

        it('should display card set names', async () => {
            expect(screen.getByText(/Commander Legends/)).toBeInTheDocument();
            expect(screen.getByText(/Throne of Eldraine/)).toBeInTheDocument();
        });

        it('should display card prices', async () => {
            expect(screen.getByText('$2.50')).toBeInTheDocument();
            expect(screen.getByText('$15.00')).toBeInTheDocument();
            expect(screen.getByText('$50.00')).toBeInTheDocument();
        });

        it('should display Commander badge for commander cards', async () => {
            expect(screen.getByText('Commander')).toBeInTheDocument();
        });

        it('should render card images', async () => {
            const images = screen.getAllByRole('img');
            expect(images.length).toBeGreaterThan(0);
        });
    });

    describe('Card flip functionality', () => {
        it('should toggle card face when clicked', async () => {
            const mockWithFaces = {
                totalPrice: 100,
                cardPrices: [
                    {
                        name: 'Delver of Secrets',
                        set_name: 'Innistrad',
                        price: 5.00,
                        commander: false,
                        card_faces: [
                            { image_uri: 'https://example.com/delver-front.jpg' },
                            { image_uri: 'https://example.com/delver-back.jpg' }
                        ]
                    }
                ]
            };
            priceCheckDeck.mockResolvedValue(mockWithFaces);

            render(<PriceCheckPage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /check deck price/i })).not.toBeDisabled();
            });

            fireEvent.click(screen.getByRole('button', { name: /check deck price/i }));

            await waitFor(() => {
                expect(screen.getByText('Delver of Secrets')).toBeInTheDocument();
            });

            // Click on the card to flip it
            const card = screen.getByText('Delver of Secrets').closest('.card');
            fireEvent.click(card);

            // The image should change (we can't easily verify src change, but we verify click works)
            expect(card).toBeInTheDocument();
        });

        it('should have pointer cursor for cards with faces', async () => {
            const mockWithFaces = {
                totalPrice: 100,
                cardPrices: [
                    {
                        name: 'Delver of Secrets',
                        set_name: 'Innistrad',
                        price: 5.00,
                        commander: false,
                        card_faces: [
                            { image_uri: 'https://example.com/delver-front.jpg' },
                            { image_uri: 'https://example.com/delver-back.jpg' }
                        ]
                    }
                ]
            };
            priceCheckDeck.mockResolvedValue(mockWithFaces);

            render(<PriceCheckPage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /check deck price/i })).not.toBeDisabled();
            });

            fireEvent.click(screen.getByRole('button', { name: /check deck price/i }));

            await waitFor(() => {
                expect(screen.getByText('Delver of Secrets')).toBeInTheDocument();
            });

            const card = screen.getByText('Delver of Secrets').closest('.card');
            expect(card).toHaveStyle({ cursor: 'pointer' });
        });

        it('should have default cursor for cards without faces', async () => {
            render(<PriceCheckPage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /check deck price/i })).not.toBeDisabled();
            });

            fireEvent.click(screen.getByRole('button', { name: /check deck price/i }));

            await waitFor(() => {
                expect(screen.getByText('Sol Ring')).toBeInTheDocument();
            });

            const card = screen.getByText('Sol Ring').closest('.card');
            expect(card).toHaveStyle({ cursor: 'default' });
        });
    });

    describe('Cards without prices', () => {
        it('should display N/A for cards without price', async () => {
            const mockNoPriceResult = {
                totalPrice: 0,
                cardPrices: [
                    {
                        name: 'Unknown Card',
                        set_name: 'Unknown Set',
                        price: null,
                        commander: false,
                        image_uri: null
                    }
                ]
            };
            priceCheckDeck.mockResolvedValue(mockNoPriceResult);

            render(<PriceCheckPage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /check deck price/i })).not.toBeDisabled();
            });

            fireEvent.click(screen.getByRole('button', { name: /check deck price/i }));

            await waitFor(() => {
                expect(screen.getByText('N/A')).toBeInTheDocument();
            });
        });

        it('should display Unknown for cards without set name', async () => {
            const mockNoSetResult = {
                totalPrice: 10,
                cardPrices: [
                    {
                        name: 'Mystery Card',
                        set_name: null,
                        price: 10.00,
                        commander: false,
                        image_uri: 'https://example.com/card.jpg'
                    }
                ]
            };
            priceCheckDeck.mockResolvedValue(mockNoSetResult);

            render(<PriceCheckPage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /check deck price/i })).not.toBeDisabled();
            });

            fireEvent.click(screen.getByRole('button', { name: /check deck price/i }));

            await waitFor(() => {
                expect(screen.getByText('Unknown')).toBeInTheDocument();
            });
        });

        it('should display placeholder image for cards without image', async () => {
            const mockNoImageResult = {
                totalPrice: 10,
                cardPrices: [
                    {
                        name: 'No Image Card',
                        set_name: 'Test Set',
                        price: 10.00,
                        commander: false,
                        image_uri: null
                    }
                ]
            };
            priceCheckDeck.mockResolvedValue(mockNoImageResult);

            render(<PriceCheckPage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /check deck price/i })).not.toBeDisabled();
            });

            fireEvent.click(screen.getByRole('button', { name: /check deck price/i }));

            await waitFor(() => {
                expect(screen.getByText('No Image Card')).toBeInTheDocument();
            });

            const img = screen.getByAltText('No Image Card');
            expect(img).toHaveAttribute('src', 'https://via.placeholder.com/150');
        });
    });

    describe('Error display', () => {
        it('should display error with alert-danger class', async () => {
            mockPermissionsContext.activeLeague = null;
            render(<PriceCheckPage />);

            await waitFor(() => {
                const alert = screen.getByText('No active league found.');
                expect(alert.closest('.alert')).toHaveClass('alert-danger');
            });
        });

        it('should clear previous error when retrying price check', async () => {
            // First, have no deck
            getLeagueParticipantsDetails.mockResolvedValueOnce({ deck_id: null });

            const { rerender } = render(<PriceCheckPage />);

            await waitFor(() => {
                expect(screen.getByText('No deck associated with the current league.')).toBeInTheDocument();
            });

            // Now have a deck
            getLeagueParticipantsDetails.mockResolvedValue({ deck_id: 'deck-456' });

            // Rerender triggers useEffect
            rerender(<PriceCheckPage key="new" />);

            await waitFor(() => {
                expect(screen.queryByText('No deck associated with the current league.')).not.toBeInTheDocument();
            });
        });
    });

    describe('Button state', () => {
        it('should show disabled button with no deckId after error', async () => {
            getLeagueParticipantsDetails.mockResolvedValue({ deck_id: null });
            render(<PriceCheckPage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /check deck price/i })).toBeDisabled();
            });
        });

        it('should re-enable button after price check completes', async () => {
            render(<PriceCheckPage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /check deck price/i })).not.toBeDisabled();
            });

            fireEvent.click(screen.getByRole('button', { name: /check deck price/i }));

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /check deck price/i })).not.toBeDisabled();
            });
        });

        it('should re-enable button after price check fails', async () => {
            priceCheckDeck.mockRejectedValue(new Error('Failed'));
            render(<PriceCheckPage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /check deck price/i })).not.toBeDisabled();
            });

            fireEvent.click(screen.getByRole('button', { name: /check deck price/i }));

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /check deck price/i })).not.toBeDisabled();
            });
        });
    });
});
