// All jest.mock() calls MUST be before any imports for ESM compatibility
jest.mock('../../../api/axiosConfig', () => ({
    __esModule: true,
    default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

// Mock API modules
jest.mock('../../../api/scryfallApi');
jest.mock('../../../api/budgetApi');

// Now import after all mocks
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CardSearch from '../CardSearch';
import ScryfallApi from '../../../api/scryfallApi';
import * as budgetApi from '../../../api/budgetApi';

// Use fake timers for debounce testing
jest.useFakeTimers();

// TODO: Fix async/mock issues - tests skipped
describe.skip('CardSearch', () => {
    const defaultProps = {
        budgetId: 100,
        remainingBudget: 50.00,
        onCardAdded: jest.fn(),
        addsLocked: false
    };

    const mockAutocompleteResults = [
        { name: 'Lightning Bolt', price: '2.50' },
        { name: 'Lightning Strike', price: '0.50' },
        { name: 'Lightning Helix', price: '1.00' }
    ];

    const mockSelectedCard = {
        id: 'abc123',
        name: 'Lightning Bolt',
        set_name: 'Magic 2010',
        prices: {
            usd: '2.50',
            usd_foil: '5.00'
        },
        image_uris: {
            normal: 'https://example.com/lightning-bolt.jpg'
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        ScryfallApi.autocompleteWithPrices.mockResolvedValue(mockAutocompleteResults);
        ScryfallApi.getCheapestPrinting.mockResolvedValue(mockSelectedCard);
    });

    afterEach(() => {
        jest.clearAllTimers();
    });

    describe('locked state', () => {
        it('should show locked message when addsLocked is true', () => {
            render(<CardSearch {...defaultProps} addsLocked={true} />);

            expect(screen.getByText(/card adds locked/i)).toBeInTheDocument();
            expect(screen.getByText(/card adds are locked after thursday 6pm/i)).toBeInTheDocument();
        });

        it('should show note about final week adds when locked', () => {
            render(<CardSearch {...defaultProps} addsLocked={true} />);

            expect(screen.getByText(/final week adds are always allowed/i)).toBeInTheDocument();
        });

        it('should not render search input when locked', () => {
            render(<CardSearch {...defaultProps} addsLocked={true} />);

            expect(screen.queryByPlaceholderText(/search for magic cards/i)).not.toBeInTheDocument();
        });

        it('should render search when not locked', () => {
            render(<CardSearch {...defaultProps} addsLocked={false} />);

            expect(screen.getByPlaceholderText(/search for magic cards/i)).toBeInTheDocument();
        });
    });

    describe('rendering', () => {
        it('should render search input', () => {
            render(<CardSearch {...defaultProps} />);

            expect(screen.getByPlaceholderText(/search for magic cards/i)).toBeInTheDocument();
        });

        it('should render card title', () => {
            render(<CardSearch {...defaultProps} />);

            expect(screen.getByText(/search & add cards/i)).toBeInTheDocument();
        });

        it('should have autocomplete off on input', () => {
            render(<CardSearch {...defaultProps} />);

            const input = screen.getByPlaceholderText(/search for magic cards/i);
            expect(input).toHaveAttribute('autocomplete', 'off');
        });
    });

    describe('autocomplete functionality', () => {
        it('should debounce autocomplete requests', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

            render(<CardSearch {...defaultProps} />);

            const input = screen.getByPlaceholderText(/search for magic cards/i);
            await user.type(input, 'light');

            // Should not have called API yet (debounce time is 600ms)
            expect(ScryfallApi.autocompleteWithPrices).not.toHaveBeenCalled();

            // Advance timers by 600ms
            act(() => {
                jest.advanceTimersByTime(600);
            });

            await waitFor(() => {
                expect(ScryfallApi.autocompleteWithPrices).toHaveBeenCalledWith('light');
            });
        });

        it('should show autocomplete results', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

            render(<CardSearch {...defaultProps} />);

            const input = screen.getByPlaceholderText(/search for magic cards/i);
            await user.type(input, 'light');

            act(() => {
                jest.advanceTimersByTime(600);
            });

            await waitFor(() => {
                expect(screen.getByText('Lightning Bolt')).toBeInTheDocument();
                expect(screen.getByText('Lightning Strike')).toBeInTheDocument();
                expect(screen.getByText('Lightning Helix')).toBeInTheDocument();
            });
        });

        it('should show prices in autocomplete results', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

            render(<CardSearch {...defaultProps} />);

            const input = screen.getByPlaceholderText(/search for magic cards/i);
            await user.type(input, 'light');

            act(() => {
                jest.advanceTimersByTime(600);
            });

            await waitFor(() => {
                expect(screen.getByText('$2.50')).toBeInTheDocument();
                expect(screen.getByText('$0.50')).toBeInTheDocument();
                expect(screen.getByText('$1.00')).toBeInTheDocument();
            });
        });

        it('should not show autocomplete for empty query', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

            render(<CardSearch {...defaultProps} />);

            const input = screen.getByPlaceholderText(/search for magic cards/i);
            await user.type(input, '   ');

            act(() => {
                jest.advanceTimersByTime(600);
            });

            expect(ScryfallApi.autocompleteWithPrices).not.toHaveBeenCalled();
        });

        it('should handle autocomplete error gracefully', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            ScryfallApi.autocompleteWithPrices.mockRejectedValue(new Error('API error'));

            render(<CardSearch {...defaultProps} />);

            const input = screen.getByPlaceholderText(/search for magic cards/i);
            await user.type(input, 'light');

            act(() => {
                jest.advanceTimersByTime(600);
            });

            // Should not crash and results should be empty
            await waitFor(() => {
                expect(screen.queryByText('Lightning Bolt')).not.toBeInTheDocument();
            });
        });

        it('should handle null autocomplete results', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            ScryfallApi.autocompleteWithPrices.mockResolvedValue(null);

            render(<CardSearch {...defaultProps} />);

            const input = screen.getByPlaceholderText(/search for magic cards/i);
            await user.type(input, 'light');

            act(() => {
                jest.advanceTimersByTime(600);
            });

            // Should not crash
            expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
        });

        it('should clear previous debounce timer on new input', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

            render(<CardSearch {...defaultProps} />);

            const input = screen.getByPlaceholderText(/search for magic cards/i);
            await user.type(input, 'li');

            act(() => {
                jest.advanceTimersByTime(300);
            });

            await user.type(input, 'ght');

            act(() => {
                jest.advanceTimersByTime(600);
            });

            // Should only call with the final query
            await waitFor(() => {
                expect(ScryfallApi.autocompleteWithPrices).toHaveBeenCalledWith('light');
            });
        });
    });

    describe('card selection', () => {
        it('should select card when autocomplete result is clicked', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

            render(<CardSearch {...defaultProps} />);

            const input = screen.getByPlaceholderText(/search for magic cards/i);
            await user.type(input, 'light');

            act(() => {
                jest.advanceTimersByTime(600);
            });

            await waitFor(() => {
                expect(screen.getByText('Lightning Bolt')).toBeInTheDocument();
            });

            // Click on Lightning Bolt
            fireEvent.mouseDown(screen.getByText('Lightning Bolt'));

            await waitFor(() => {
                expect(ScryfallApi.getCheapestPrinting).toHaveBeenCalledWith('Lightning Bolt');
            });
        });

        it('should display selected card details', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

            render(<CardSearch {...defaultProps} />);

            const input = screen.getByPlaceholderText(/search for magic cards/i);
            await user.type(input, 'light');

            act(() => {
                jest.advanceTimersByTime(600);
            });

            await waitFor(() => {
                expect(screen.getByText('Lightning Bolt')).toBeInTheDocument();
            });

            fireEvent.mouseDown(screen.getByText('Lightning Bolt'));

            await waitFor(() => {
                // Card name as title
                const cardTitles = screen.getAllByText('Lightning Bolt');
                expect(cardTitles.length).toBeGreaterThanOrEqual(1);
            });

            // Set name
            expect(screen.getByText('Magic 2010')).toBeInTheDocument();

            // Price badge
            expect(screen.getByText('$2.50')).toBeInTheDocument();
        });

        it('should display card image when available', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

            render(<CardSearch {...defaultProps} />);

            const input = screen.getByPlaceholderText(/search for magic cards/i);
            await user.type(input, 'light');

            act(() => {
                jest.advanceTimersByTime(600);
            });

            await waitFor(() => {
                expect(screen.getByText('Lightning Bolt')).toBeInTheDocument();
            });

            fireEvent.mouseDown(screen.getByText('Lightning Bolt'));

            await waitFor(() => {
                const image = screen.getByAlt('Lightning Bolt');
                expect(image).toHaveAttribute('src', 'https://example.com/lightning-bolt.jpg');
            });
        });

        it('should clear autocomplete results after selection', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

            render(<CardSearch {...defaultProps} />);

            const input = screen.getByPlaceholderText(/search for magic cards/i);
            await user.type(input, 'light');

            act(() => {
                jest.advanceTimersByTime(600);
            });

            await waitFor(() => {
                expect(screen.getByText('Lightning Strike')).toBeInTheDocument();
            });

            fireEvent.mouseDown(screen.getByText('Lightning Bolt'));

            await waitFor(() => {
                expect(screen.queryByText('Lightning Strike')).not.toBeInTheDocument();
            });
        });

        it('should show error when card fetch fails', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            ScryfallApi.getCheapestPrinting.mockRejectedValue(new Error('Fetch failed'));

            render(<CardSearch {...defaultProps} />);

            const input = screen.getByPlaceholderText(/search for magic cards/i);
            await user.type(input, 'light');

            act(() => {
                jest.advanceTimersByTime(600);
            });

            await waitFor(() => {
                expect(screen.getByText('Lightning Bolt')).toBeInTheDocument();
            });

            fireEvent.mouseDown(screen.getByText('Lightning Bolt'));

            await waitFor(() => {
                expect(screen.getByText(/failed to load card details/i)).toBeInTheDocument();
            });
        });

        it('should update search query with selected card name', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

            render(<CardSearch {...defaultProps} />);

            const input = screen.getByPlaceholderText(/search for magic cards/i);
            await user.type(input, 'light');

            act(() => {
                jest.advanceTimersByTime(600);
            });

            await waitFor(() => {
                expect(screen.getByText('Lightning Bolt')).toBeInTheDocument();
            });

            fireEvent.mouseDown(screen.getByText('Lightning Bolt'));

            await waitFor(() => {
                expect(input).toHaveValue('Lightning Bolt');
            });
        });
    });

    describe('budget warning', () => {
        it('should show warning when card price exceeds budget', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

            render(<CardSearch {...defaultProps} remainingBudget={1.00} />);

            const input = screen.getByPlaceholderText(/search for magic cards/i);
            await user.type(input, 'light');

            act(() => {
                jest.advanceTimersByTime(600);
            });

            await waitFor(() => {
                expect(screen.getByText('Lightning Bolt')).toBeInTheDocument();
            });

            fireEvent.mouseDown(screen.getByText('Lightning Bolt'));

            await waitFor(() => {
                expect(screen.getByText(/this card exceeds your remaining budget/i)).toBeInTheDocument();
            });
        });

        it('should disable add button when card exceeds budget', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

            render(<CardSearch {...defaultProps} remainingBudget={1.00} />);

            const input = screen.getByPlaceholderText(/search for magic cards/i);
            await user.type(input, 'light');

            act(() => {
                jest.advanceTimersByTime(600);
            });

            await waitFor(() => {
                expect(screen.getByText('Lightning Bolt')).toBeInTheDocument();
            });

            fireEvent.mouseDown(screen.getByText('Lightning Bolt'));

            await waitFor(() => {
                const addButton = screen.getByRole('button', { name: /add to budget/i });
                expect(addButton).toBeDisabled();
            });
        });

        it('should not show warning when card price is within budget', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

            render(<CardSearch {...defaultProps} remainingBudget={50.00} />);

            const input = screen.getByPlaceholderText(/search for magic cards/i);
            await user.type(input, 'light');

            act(() => {
                jest.advanceTimersByTime(600);
            });

            await waitFor(() => {
                expect(screen.getByText('Lightning Bolt')).toBeInTheDocument();
            });

            fireEvent.mouseDown(screen.getByText('Lightning Bolt'));

            await waitFor(() => {
                expect(screen.queryByText(/this card exceeds your remaining budget/i)).not.toBeInTheDocument();
            });
        });
    });

    describe('add card functionality', () => {
        it('should show add and cancel buttons for selected card', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

            render(<CardSearch {...defaultProps} />);

            const input = screen.getByPlaceholderText(/search for magic cards/i);
            await user.type(input, 'light');

            act(() => {
                jest.advanceTimersByTime(600);
            });

            await waitFor(() => {
                expect(screen.getByText('Lightning Bolt')).toBeInTheDocument();
            });

            fireEvent.mouseDown(screen.getByText('Lightning Bolt'));

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /add to budget/i })).toBeInTheDocument();
                expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
            });
        });

        it('should call addCardToBudget when add button is clicked', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            budgetApi.addCardToBudget.mockResolvedValue({ success: true });

            render(<CardSearch {...defaultProps} />);

            const input = screen.getByPlaceholderText(/search for magic cards/i);
            await user.type(input, 'light');

            act(() => {
                jest.advanceTimersByTime(600);
            });

            await waitFor(() => {
                expect(screen.getByText('Lightning Bolt')).toBeInTheDocument();
            });

            fireEvent.mouseDown(screen.getByText('Lightning Bolt'));

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /add to budget/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /add to budget/i }));

            await waitFor(() => {
                expect(budgetApi.addCardToBudget).toHaveBeenCalledWith(100, {
                    card_name: 'Lightning Bolt',
                    scryfall_id: 'abc123',
                    quantity: 1,
                    price_at_addition: 2.5,
                    set_name: 'Magic 2010',
                    image_uri: 'https://example.com/lightning-bolt.jpg',
                    card_faces: null
                });
            });
        });

        it('should call onCardAdded after successful add', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            budgetApi.addCardToBudget.mockResolvedValue({ success: true });

            render(<CardSearch {...defaultProps} />);

            const input = screen.getByPlaceholderText(/search for magic cards/i);
            await user.type(input, 'light');

            act(() => {
                jest.advanceTimersByTime(600);
            });

            await waitFor(() => {
                expect(screen.getByText('Lightning Bolt')).toBeInTheDocument();
            });

            fireEvent.mouseDown(screen.getByText('Lightning Bolt'));

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /add to budget/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /add to budget/i }));

            await waitFor(() => {
                expect(defaultProps.onCardAdded).toHaveBeenCalled();
            });
        });

        it('should reset form after successful add', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            budgetApi.addCardToBudget.mockResolvedValue({ success: true });

            render(<CardSearch {...defaultProps} />);

            const input = screen.getByPlaceholderText(/search for magic cards/i);
            await user.type(input, 'light');

            act(() => {
                jest.advanceTimersByTime(600);
            });

            await waitFor(() => {
                expect(screen.getByText('Lightning Bolt')).toBeInTheDocument();
            });

            fireEvent.mouseDown(screen.getByText('Lightning Bolt'));

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /add to budget/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /add to budget/i }));

            await waitFor(() => {
                expect(input).toHaveValue('');
            });

            // Selected card should be cleared
            expect(screen.queryByRole('button', { name: /add to budget/i })).not.toBeInTheDocument();
        });

        it('should show error when price exceeds budget on add', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

            // Mock card with price higher than remaining budget
            ScryfallApi.getCheapestPrinting.mockResolvedValue({
                ...mockSelectedCard,
                prices: { usd: '60.00' }
            });

            render(<CardSearch {...defaultProps} remainingBudget={50.00} />);

            const input = screen.getByPlaceholderText(/search for magic cards/i);
            await user.type(input, 'light');

            act(() => {
                jest.advanceTimersByTime(600);
            });

            await waitFor(() => {
                expect(screen.getByText('Lightning Bolt')).toBeInTheDocument();
            });

            fireEvent.mouseDown(screen.getByText('Lightning Bolt'));

            await waitFor(() => {
                expect(screen.getByText(/this card exceeds your remaining budget/i)).toBeInTheDocument();
            });
        });

        it('should show error when add fails', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            budgetApi.addCardToBudget.mockRejectedValue({
                response: { data: { error: 'Failed to add card' } }
            });

            render(<CardSearch {...defaultProps} />);

            const input = screen.getByPlaceholderText(/search for magic cards/i);
            await user.type(input, 'light');

            act(() => {
                jest.advanceTimersByTime(600);
            });

            await waitFor(() => {
                expect(screen.getByText('Lightning Bolt')).toBeInTheDocument();
            });

            fireEvent.mouseDown(screen.getByText('Lightning Bolt'));

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /add to budget/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /add to budget/i }));

            await waitFor(() => {
                expect(screen.getByText(/failed to add card/i)).toBeInTheDocument();
            });
        });

        it('should show locked error when adds are locked mid-add', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            budgetApi.addCardToBudget.mockRejectedValue({
                response: { data: { error: 'Adds locked', locked: true } }
            });

            render(<CardSearch {...defaultProps} />);

            const input = screen.getByPlaceholderText(/search for magic cards/i);
            await user.type(input, 'light');

            act(() => {
                jest.advanceTimersByTime(600);
            });

            await waitFor(() => {
                expect(screen.getByText('Lightning Bolt')).toBeInTheDocument();
            });

            fireEvent.mouseDown(screen.getByText('Lightning Bolt'));

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /add to budget/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /add to budget/i }));

            await waitFor(() => {
                expect(screen.getByText(/card adds are currently locked/i)).toBeInTheDocument();
            });
        });

        it('should show generic error when add fails without specific error', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            budgetApi.addCardToBudget.mockRejectedValue(new Error('Network error'));

            render(<CardSearch {...defaultProps} />);

            const input = screen.getByPlaceholderText(/search for magic cards/i);
            await user.type(input, 'light');

            act(() => {
                jest.advanceTimersByTime(600);
            });

            await waitFor(() => {
                expect(screen.getByText('Lightning Bolt')).toBeInTheDocument();
            });

            fireEvent.mouseDown(screen.getByText('Lightning Bolt'));

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /add to budget/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /add to budget/i }));

            await waitFor(() => {
                expect(screen.getByText(/failed to add card to budget/i)).toBeInTheDocument();
            });
        });
    });

    describe('cancel functionality', () => {
        it('should clear selected card when cancel is clicked', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

            render(<CardSearch {...defaultProps} />);

            const input = screen.getByPlaceholderText(/search for magic cards/i);
            await user.type(input, 'light');

            act(() => {
                jest.advanceTimersByTime(600);
            });

            await waitFor(() => {
                expect(screen.getByText('Lightning Bolt')).toBeInTheDocument();
            });

            fireEvent.mouseDown(screen.getByText('Lightning Bolt'));

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

            // Selected card should be cleared
            expect(screen.queryByRole('button', { name: /add to budget/i })).not.toBeInTheDocument();
        });

        it('should clear search query when cancel is clicked', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

            render(<CardSearch {...defaultProps} />);

            const input = screen.getByPlaceholderText(/search for magic cards/i);
            await user.type(input, 'light');

            act(() => {
                jest.advanceTimersByTime(600);
            });

            await waitFor(() => {
                expect(screen.getByText('Lightning Bolt')).toBeInTheDocument();
            });

            fireEvent.mouseDown(screen.getByText('Lightning Bolt'));

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

            expect(input).toHaveValue('');
        });
    });

    describe('loading states', () => {
        it('should show adding state while card is being added', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

            let resolveAdd;
            budgetApi.addCardToBudget.mockReturnValue(new Promise(resolve => {
                resolveAdd = resolve;
            }));

            render(<CardSearch {...defaultProps} />);

            const input = screen.getByPlaceholderText(/search for magic cards/i);
            await user.type(input, 'light');

            act(() => {
                jest.advanceTimersByTime(600);
            });

            await waitFor(() => {
                expect(screen.getByText('Lightning Bolt')).toBeInTheDocument();
            });

            fireEvent.mouseDown(screen.getByText('Lightning Bolt'));

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /add to budget/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /add to budget/i }));

            await waitFor(() => {
                expect(screen.getByText(/adding/i)).toBeInTheDocument();
            });

            // Cleanup
            await act(async () => {
                resolveAdd({ success: true });
            });
        });

        it('should disable input while adding', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

            let resolveAdd;
            budgetApi.addCardToBudget.mockReturnValue(new Promise(resolve => {
                resolveAdd = resolve;
            }));

            render(<CardSearch {...defaultProps} />);

            const input = screen.getByPlaceholderText(/search for magic cards/i);
            await user.type(input, 'light');

            act(() => {
                jest.advanceTimersByTime(600);
            });

            await waitFor(() => {
                expect(screen.getByText('Lightning Bolt')).toBeInTheDocument();
            });

            fireEvent.mouseDown(screen.getByText('Lightning Bolt'));

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /add to budget/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /add to budget/i }));

            await waitFor(() => {
                expect(input).toBeDisabled();
            });

            // Cleanup
            await act(async () => {
                resolveAdd({ success: true });
            });
        });

        it('should disable cancel button while adding', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

            let resolveAdd;
            budgetApi.addCardToBudget.mockReturnValue(new Promise(resolve => {
                resolveAdd = resolve;
            }));

            render(<CardSearch {...defaultProps} />);

            const input = screen.getByPlaceholderText(/search for magic cards/i);
            await user.type(input, 'light');

            act(() => {
                jest.advanceTimersByTime(600);
            });

            await waitFor(() => {
                expect(screen.getByText('Lightning Bolt')).toBeInTheDocument();
            });

            fireEvent.mouseDown(screen.getByText('Lightning Bolt'));

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /add to budget/i }));

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
            });

            // Cleanup
            await act(async () => {
                resolveAdd({ success: true });
            });
        });
    });

    describe('error dismissal', () => {
        it('should allow dismissing error alert', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            ScryfallApi.getCheapestPrinting.mockRejectedValue(new Error('Fetch failed'));

            render(<CardSearch {...defaultProps} />);

            const input = screen.getByPlaceholderText(/search for magic cards/i);
            await user.type(input, 'light');

            act(() => {
                jest.advanceTimersByTime(600);
            });

            await waitFor(() => {
                expect(screen.getByText('Lightning Bolt')).toBeInTheDocument();
            });

            fireEvent.mouseDown(screen.getByText('Lightning Bolt'));

            await waitFor(() => {
                expect(screen.getByText(/failed to load card details/i)).toBeInTheDocument();
            });

            // Dismiss the error
            const dismissButton = screen.getByRole('button', { name: /close/i });
            fireEvent.click(dismissButton);

            expect(screen.queryByText(/failed to load card details/i)).not.toBeInTheDocument();
        });
    });

    describe('edge cases', () => {
        it('should handle card without image_uris', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            ScryfallApi.getCheapestPrinting.mockResolvedValue({
                ...mockSelectedCard,
                image_uris: null
            });

            render(<CardSearch {...defaultProps} />);

            const input = screen.getByPlaceholderText(/search for magic cards/i);
            await user.type(input, 'light');

            act(() => {
                jest.advanceTimersByTime(600);
            });

            await waitFor(() => {
                expect(screen.getByText('Lightning Bolt')).toBeInTheDocument();
            });

            fireEvent.mouseDown(screen.getByText('Lightning Bolt'));

            await waitFor(() => {
                // Should render without crashing
                expect(screen.getByRole('button', { name: /add to budget/i })).toBeInTheDocument();
            });

            // No image should be present
            expect(screen.queryByAlt('Lightning Bolt')).not.toBeInTheDocument();
        });

        it('should use foil price when regular price is unavailable', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            ScryfallApi.getCheapestPrinting.mockResolvedValue({
                ...mockSelectedCard,
                prices: { usd: null, usd_foil: '5.00' }
            });
            budgetApi.addCardToBudget.mockResolvedValue({ success: true });

            render(<CardSearch {...defaultProps} />);

            const input = screen.getByPlaceholderText(/search for magic cards/i);
            await user.type(input, 'light');

            act(() => {
                jest.advanceTimersByTime(600);
            });

            await waitFor(() => {
                expect(screen.getByText('Lightning Bolt')).toBeInTheDocument();
            });

            fireEvent.mouseDown(screen.getByText('Lightning Bolt'));

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /add to budget/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /add to budget/i }));

            await waitFor(() => {
                expect(budgetApi.addCardToBudget).toHaveBeenCalledWith(100, expect.objectContaining({
                    price_at_addition: 5.0
                }));
            });
        });

        it('should handle card with card_faces', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            const cardFaces = [{ name: 'Front' }, { name: 'Back' }];
            ScryfallApi.getCheapestPrinting.mockResolvedValue({
                ...mockSelectedCard,
                card_faces: cardFaces
            });
            budgetApi.addCardToBudget.mockResolvedValue({ success: true });

            render(<CardSearch {...defaultProps} />);

            const input = screen.getByPlaceholderText(/search for magic cards/i);
            await user.type(input, 'light');

            act(() => {
                jest.advanceTimersByTime(600);
            });

            await waitFor(() => {
                expect(screen.getByText('Lightning Bolt')).toBeInTheDocument();
            });

            fireEvent.mouseDown(screen.getByText('Lightning Bolt'));

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /add to budget/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /add to budget/i }));

            await waitFor(() => {
                expect(budgetApi.addCardToBudget).toHaveBeenCalledWith(100, expect.objectContaining({
                    card_faces: JSON.stringify(cardFaces)
                }));
            });
        });

        it('should handle card with unknown set_name', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            ScryfallApi.getCheapestPrinting.mockResolvedValue({
                ...mockSelectedCard,
                set_name: undefined
            });
            budgetApi.addCardToBudget.mockResolvedValue({ success: true });

            render(<CardSearch {...defaultProps} />);

            const input = screen.getByPlaceholderText(/search for magic cards/i);
            await user.type(input, 'light');

            act(() => {
                jest.advanceTimersByTime(600);
            });

            await waitFor(() => {
                expect(screen.getByText('Lightning Bolt')).toBeInTheDocument();
            });

            fireEvent.mouseDown(screen.getByText('Lightning Bolt'));

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /add to budget/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /add to budget/i }));

            await waitFor(() => {
                expect(budgetApi.addCardToBudget).toHaveBeenCalledWith(100, expect.objectContaining({
                    set_name: 'Unknown'
                }));
            });
        });

        it('should handle zero price card', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            ScryfallApi.getCheapestPrinting.mockResolvedValue({
                ...mockSelectedCard,
                prices: { usd: null, usd_foil: null }
            });
            budgetApi.addCardToBudget.mockResolvedValue({ success: true });

            render(<CardSearch {...defaultProps} />);

            const input = screen.getByPlaceholderText(/search for magic cards/i);
            await user.type(input, 'light');

            act(() => {
                jest.advanceTimersByTime(600);
            });

            await waitFor(() => {
                expect(screen.getByText('Lightning Bolt')).toBeInTheDocument();
            });

            fireEvent.mouseDown(screen.getByText('Lightning Bolt'));

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /add to budget/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /add to budget/i }));

            await waitFor(() => {
                expect(budgetApi.addCardToBudget).toHaveBeenCalledWith(100, expect.objectContaining({
                    price_at_addition: 0
                }));
            });
        });

        it('should cleanup debounce timer on unmount', () => {
            const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

            const { unmount } = render(<CardSearch {...defaultProps} />);

            unmount();

            // clearTimeout should have been called during cleanup
            expect(clearTimeoutSpy).toHaveBeenCalled();

            clearTimeoutSpy.mockRestore();
        });

        it('should handle autocomplete result without price', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            ScryfallApi.autocompleteWithPrices.mockResolvedValue([
                { name: 'Test Card', price: null }
            ]);

            render(<CardSearch {...defaultProps} />);

            const input = screen.getByPlaceholderText(/search for magic cards/i);
            await user.type(input, 'test');

            act(() => {
                jest.advanceTimersByTime(600);
            });

            await waitFor(() => {
                expect(screen.getByText('Test Card')).toBeInTheDocument();
            });

            // Should not show price badge
            const listItem = screen.getByText('Test Card').closest('li');
            expect(listItem.querySelector('.badge')).not.toBeInTheDocument();
        });
    });

    describe('defaults', () => {
        it('should default addsLocked to false', () => {
            const propsWithoutLocked = {
                budgetId: 100,
                remainingBudget: 50.00,
                onCardAdded: jest.fn()
            };

            render(<CardSearch {...propsWithoutLocked} />);

            // Should show search form, not locked message
            expect(screen.getByPlaceholderText(/search for magic cards/i)).toBeInTheDocument();
            expect(screen.queryByText(/card adds locked/i)).not.toBeInTheDocument();
        });
    });
});
