// Mock react-router-dom - MUST be before any imports
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    Link: ({ children, to }) => <a href={to}>{children}</a>,
    NavLink: ({ children, to }) => <a href={to}>{children}</a>,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/', search: '', state: null }),
    useParams: () => ({}),
    MemoryRouter: ({ children }) => <>{children}</>,
    BrowserRouter: ({ children }) => <>{children}</>
}));

// Mock APIs - MUST be before any imports
jest.mock('../../../api/leaguesApi', () => ({
    getLeagues: jest.fn()
}));

jest.mock('../../../api/userLeaguesApi', () => ({
    getUserPendingSignupRequests: jest.fn(),
    requestSignupForLeague: jest.fn()
}));

jest.mock('../../../api/decksApi', () => ({
    validateAndCacheDeck: jest.fn()
}));

jest.mock('../../../api/scryfallApi', () => ({
    __esModule: true,
    default: {
        autocomplete: jest.fn(),
        getCardByName: jest.fn()
    }
}));

// Mock PermissionsProvider
const mockPermissionsContext = {
    activeLeague: null,
    loading: false
};

jest.mock('../../../context/PermissionsProvider', () => ({
    usePermissions: () => mockPermissionsContext
}));

// Mock axiosConfig to prevent ESM issues
jest.mock('../../../api/axiosConfig', () => ({
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
import SignUp from '../SignUp';
import { getLeagues } from '../../../api/leaguesApi';
import { getUserPendingSignupRequests, requestSignupForLeague } from '../../../api/userLeaguesApi';
import { validateAndCacheDeck } from '../../../api/decksApi';
import ScryfallApi from '../../../api/scryfallApi';

// Get references to the mocked functions
const mockAutocomplete = ScryfallApi.autocomplete;
const mockGetCardByName = ScryfallApi.getCardByName;

describe('SignUp', () => {
    const mockLeagues = [
        { id: 1, name: 'Summer League 2024', is_active: true },
        { id: 2, name: 'Winter League 2024', is_active: true },
        { id: 3, name: 'Old League', is_active: false }
    ];

    const mockCommanderSuggestions = [
        { name: 'Kenrith, the Returned King', image: 'https://example.com/kenrith.jpg' },
        { name: 'Korvold, Fae-Cursed King', image: 'https://example.com/korvold.jpg' }
    ];

    const mockPartnerSuggestions = [
        { name: 'Thrasios, Triton Hero', image: 'https://example.com/thrasios.jpg' },
        { name: 'Tymna the Weaver', image: 'https://example.com/tymna.jpg' }
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        mockPermissionsContext.activeLeague = null;
        mockPermissionsContext.loading = false;
        getLeagues.mockResolvedValue(mockLeagues);
        getUserPendingSignupRequests.mockResolvedValue([]);
        validateAndCacheDeck.mockResolvedValue({ deck: { id: 'deck-123' } });
        requestSignupForLeague.mockResolvedValue({ message: 'Successfully signed up!' });
        mockAutocomplete.mockResolvedValue(mockCommanderSuggestions);
        mockGetCardByName.mockResolvedValue({
            id: 'card-123',
            oracle_text: '',
            keywords: []
        });
    });

    describe('Loading state', () => {
        it('should display loading when permissions are loading', () => {
            mockPermissionsContext.loading = true;
            render(<SignUp />);
            // Should not render form while loading permissions
        });

        it('should display loading while fetching leagues', () => {
            getLeagues.mockImplementation(() => new Promise(() => {})); // Never resolves
            render(<SignUp />);
            expect(screen.getByText('Loading...')).toBeInTheDocument();
        });
    });

    describe('Redirect when in league', () => {
        it('should navigate to /leagues if user has activeLeague', async () => {
            mockPermissionsContext.activeLeague = { league_id: 1, name: 'Test League' };
            render(<SignUp />);
            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/leagues');
            });
        });
    });

    describe('Pending request state', () => {
        it('should display pending message when user has pending request', async () => {
            getUserPendingSignupRequests.mockResolvedValue([{ id: 1, status: 'pending' }]);
            render(<SignUp />);
            await waitFor(() => {
                expect(screen.getByText(/You already have a pending signup request/i)).toBeInTheDocument();
            });
        });

        it('should not display form when user has pending request', async () => {
            getUserPendingSignupRequests.mockResolvedValue([{ id: 1, status: 'pending' }]);
            render(<SignUp />);
            await waitFor(() => {
                expect(screen.queryByRole('button', { name: /sign up/i })).not.toBeInTheDocument();
            });
        });
    });

    describe('Form rendering', () => {
        it('should render page title', async () => {
            render(<SignUp />);
            await waitFor(() => {
                expect(screen.getByRole('heading', { name: /sign up for a league/i })).toBeInTheDocument();
            });
        });

        it('should render league select dropdown', async () => {
            render(<SignUp />);
            await waitFor(() => {
                expect(screen.getByLabelText(/select a league/i)).toBeInTheDocument();
            });
        });

        it('should render commander input', async () => {
            render(<SignUp />);
            await waitFor(() => {
                expect(screen.getByLabelText(/commander/i)).toBeInTheDocument();
            });
        });

        it('should render decklist URL input', async () => {
            render(<SignUp />);
            await waitFor(() => {
                expect(screen.getByLabelText(/decklist url/i)).toBeInTheDocument();
            });
        });

        it('should render submit button', async () => {
            render(<SignUp />);
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
            });
        });

        it('should only show active leagues in dropdown', async () => {
            render(<SignUp />);
            await waitFor(() => {
                expect(screen.getByText('Summer League 2024')).toBeInTheDocument();
                expect(screen.getByText('Winter League 2024')).toBeInTheDocument();
                expect(screen.queryByText('Old League')).not.toBeInTheDocument();
            });
        });
    });

    describe('League selection', () => {
        it('should update selected league when option is chosen', async () => {
            render(<SignUp />);
            await waitFor(() => {
                expect(screen.getByLabelText(/select a league/i)).toBeInTheDocument();
            });

            const select = screen.getByLabelText(/select a league/i);
            fireEvent.change(select, { target: { value: '1' } });
            expect(select.value).toBe('1');
        });

        it('should disable submit when no league is selected', async () => {
            render(<SignUp />);
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /sign up/i })).toBeDisabled();
            });
        });

        it('should enable submit when league is selected', async () => {
            render(<SignUp />);
            await waitFor(() => {
                expect(screen.getByLabelText(/select a league/i)).toBeInTheDocument();
            });

            const select = screen.getByLabelText(/select a league/i);
            fireEvent.change(select, { target: { value: '1' } });

            expect(screen.getByRole('button', { name: /sign up/i })).not.toBeDisabled();
        });
    });

    describe('Commander autocomplete', () => {
        it('should fetch suggestions when typing in commander field', async () => {
            render(<SignUp />);
            await waitFor(() => {
                expect(screen.getByLabelText(/^commander$/i)).toBeInTheDocument();
            });

            const input = screen.getByLabelText(/^commander$/i);
            fireEvent.change(input, { target: { value: 'Ken' } });

            await waitFor(() => {
                expect(mockAutocomplete).toHaveBeenCalledWith('Ken', null);
            });
        });

        it('should display commander suggestions', async () => {
            render(<SignUp />);
            await waitFor(() => {
                expect(screen.getByLabelText(/^commander$/i)).toBeInTheDocument();
            });

            const input = screen.getByLabelText(/^commander$/i);
            fireEvent.change(input, { target: { value: 'Ken' } });

            await waitFor(() => {
                expect(screen.getByText('Kenrith, the Returned King')).toBeInTheDocument();
            });
        });

        it('should display commander suggestion images', async () => {
            render(<SignUp />);
            await waitFor(() => {
                expect(screen.getByLabelText(/^commander$/i)).toBeInTheDocument();
            });

            const input = screen.getByLabelText(/^commander$/i);
            fireEvent.change(input, { target: { value: 'Ken' } });

            await waitFor(() => {
                const img = screen.getByAltText('Kenrith, the Returned King');
                expect(img).toBeInTheDocument();
            });
        });

        it('should select commander when suggestion is clicked', async () => {
            render(<SignUp />);
            await waitFor(() => {
                expect(screen.getByLabelText(/^commander$/i)).toBeInTheDocument();
            });

            const input = screen.getByLabelText(/^commander$/i);
            fireEvent.change(input, { target: { value: 'Ken' } });

            await waitFor(() => {
                expect(screen.getByText('Kenrith, the Returned King')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Kenrith, the Returned King'));

            expect(input.value).toBe('Kenrith, the Returned King');
        });

        it('should clear suggestions after selection', async () => {
            render(<SignUp />);
            await waitFor(() => {
                expect(screen.getByLabelText(/^commander$/i)).toBeInTheDocument();
            });

            const input = screen.getByLabelText(/^commander$/i);
            fireEvent.change(input, { target: { value: 'Ken' } });

            await waitFor(() => {
                expect(screen.getByText('Kenrith, the Returned King')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Kenrith, the Returned King'));

            await waitFor(() => {
                expect(screen.queryByRole('list')).not.toBeInTheDocument();
            });
        });

        it('should clear suggestions when input is emptied', async () => {
            render(<SignUp />);
            await waitFor(() => {
                expect(screen.getByLabelText(/^commander$/i)).toBeInTheDocument();
            });

            const input = screen.getByLabelText(/^commander$/i);
            fireEvent.change(input, { target: { value: 'Ken' } });

            await waitFor(() => {
                expect(screen.getByText('Kenrith, the Returned King')).toBeInTheDocument();
            });

            fireEvent.change(input, { target: { value: '' } });

            await waitFor(() => {
                expect(screen.queryByText('Kenrith, the Returned King')).not.toBeInTheDocument();
            });
        });
    });

    describe('Partner commander', () => {
        it('should show partner field when commander has partner ability', async () => {
            mockGetCardByName.mockResolvedValue({
                id: 'card-partner',
                oracle_text: 'Partner (You can have two commanders if both have partner.)',
                keywords: []
            });

            render(<SignUp />);
            await waitFor(() => {
                expect(screen.getByLabelText(/^commander$/i)).toBeInTheDocument();
            });

            const input = screen.getByLabelText(/^commander$/i);
            fireEvent.change(input, { target: { value: 'Thr' } });

            await waitFor(() => {
                expect(screen.getByText('Kenrith, the Returned King')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Kenrith, the Returned King'));

            await waitFor(() => {
                expect(screen.getByLabelText(/commander partner/i)).toBeInTheDocument();
            });
        });

        it('should show partner field when commander has Choose a Background', async () => {
            mockGetCardByName.mockResolvedValue({
                id: 'card-background',
                oracle_text: '',
                keywords: ['Choose a Background']
            });

            render(<SignUp />);
            await waitFor(() => {
                expect(screen.getByLabelText(/^commander$/i)).toBeInTheDocument();
            });

            const input = screen.getByLabelText(/^commander$/i);
            fireEvent.change(input, { target: { value: 'Wyl' } });

            await waitFor(() => {
                expect(screen.getByText('Kenrith, the Returned King')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Kenrith, the Returned King'));

            await waitFor(() => {
                expect(screen.getByLabelText(/commander partner/i)).toBeInTheDocument();
            });
        });

        it('should not show partner field for regular commanders', async () => {
            mockGetCardByName.mockResolvedValue({
                id: 'card-regular',
                oracle_text: 'Flying, vigilance',
                keywords: ['Flying', 'Vigilance']
            });

            render(<SignUp />);
            await waitFor(() => {
                expect(screen.getByLabelText(/^commander$/i)).toBeInTheDocument();
            });

            const input = screen.getByLabelText(/^commander$/i);
            fireEvent.change(input, { target: { value: 'Ken' } });

            await waitFor(() => {
                expect(screen.getByText('Kenrith, the Returned King')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Kenrith, the Returned King'));

            await waitFor(() => {
                expect(screen.queryByLabelText(/commander partner/i)).not.toBeInTheDocument();
            });
        });

        it('should fetch partner suggestions with filter', async () => {
            mockGetCardByName.mockResolvedValue({
                id: 'card-partner',
                oracle_text: 'Partner',
                keywords: []
            });

            render(<SignUp />);
            await waitFor(() => {
                expect(screen.getByLabelText(/^commander$/i)).toBeInTheDocument();
            });

            const commanderInput = screen.getByLabelText(/^commander$/i);
            fireEvent.change(commanderInput, { target: { value: 'Thr' } });

            await waitFor(() => {
                expect(screen.getByText('Kenrith, the Returned King')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Kenrith, the Returned King'));

            await waitFor(() => {
                expect(screen.getByLabelText(/commander partner/i)).toBeInTheDocument();
            });

            mockAutocomplete.mockResolvedValue(mockPartnerSuggestions);

            const partnerInput = screen.getByLabelText(/commander partner/i);
            fireEvent.change(partnerInput, { target: { value: 'Thr' } });

            await waitFor(() => {
                expect(mockAutocomplete).toHaveBeenLastCalledWith('Thr', 'partner');
            });
        });

        it('should select partner when clicked', async () => {
            mockGetCardByName.mockResolvedValue({
                id: 'card-partner',
                oracle_text: 'Partner',
                keywords: []
            });

            render(<SignUp />);
            await waitFor(() => {
                expect(screen.getByLabelText(/^commander$/i)).toBeInTheDocument();
            });

            const commanderInput = screen.getByLabelText(/^commander$/i);
            fireEvent.change(commanderInput, { target: { value: 'Thr' } });

            await waitFor(() => {
                expect(screen.getByText('Kenrith, the Returned King')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Kenrith, the Returned King'));

            await waitFor(() => {
                expect(screen.getByLabelText(/commander partner/i)).toBeInTheDocument();
            });

            mockAutocomplete.mockResolvedValue(mockPartnerSuggestions);

            const partnerInput = screen.getByLabelText(/commander partner/i);
            fireEvent.change(partnerInput, { target: { value: 'Thr' } });

            await waitFor(() => {
                expect(screen.getByText('Thrasios, Triton Hero')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Thrasios, Triton Hero'));

            expect(partnerInput.value).toBe('Thrasios, Triton Hero');
        });
    });

    describe('Decklist URL validation', () => {
        it('should call validateAndCacheDeck on form submit', async () => {
            render(<SignUp />);
            await waitFor(() => {
                expect(screen.getByLabelText(/select a league/i)).toBeInTheDocument();
            });

            // Fill out form
            fireEvent.change(screen.getByLabelText(/select a league/i), { target: { value: '1' } });
            fireEvent.change(screen.getByLabelText(/^commander$/i), { target: { value: 'Kenrith' } });
            fireEvent.change(screen.getByLabelText(/decklist url/i), { target: { value: 'https://archidekt.com/decks/123' } });

            fireEvent.submit(screen.getByRole('button', { name: /sign up/i }));

            await waitFor(() => {
                expect(validateAndCacheDeck).toHaveBeenCalledWith({ decklistUrl: 'https://archidekt.com/decks/123' });
            });
        });

        it('should display validation error when deck validation fails', async () => {
            validateAndCacheDeck.mockRejectedValue(new Error('Invalid deck'));

            render(<SignUp />);
            await waitFor(() => {
                expect(screen.getByLabelText(/select a league/i)).toBeInTheDocument();
            });

            fireEvent.change(screen.getByLabelText(/select a league/i), { target: { value: '1' } });
            fireEvent.change(screen.getByLabelText(/^commander$/i), { target: { value: 'Kenrith' } });
            fireEvent.change(screen.getByLabelText(/decklist url/i), { target: { value: 'invalid-url' } });

            fireEvent.submit(screen.getByRole('button', { name: /sign up/i }));

            await waitFor(() => {
                expect(screen.getByText(/Invalid decklist URL/i)).toBeInTheDocument();
            });
        });

        it('should stop signup if deck validation fails', async () => {
            validateAndCacheDeck.mockRejectedValue(new Error('Invalid deck'));

            render(<SignUp />);
            await waitFor(() => {
                expect(screen.getByLabelText(/select a league/i)).toBeInTheDocument();
            });

            fireEvent.change(screen.getByLabelText(/select a league/i), { target: { value: '1' } });
            fireEvent.change(screen.getByLabelText(/^commander$/i), { target: { value: 'Kenrith' } });
            fireEvent.change(screen.getByLabelText(/decklist url/i), { target: { value: 'invalid-url' } });

            fireEvent.submit(screen.getByRole('button', { name: /sign up/i }));

            await waitFor(() => {
                expect(screen.getByText(/Invalid decklist URL/i)).toBeInTheDocument();
            });

            expect(requestSignupForLeague).not.toHaveBeenCalled();
        });
    });

    describe('Form submission', () => {
        it('should call requestSignupForLeague with correct data', async () => {
            mockGetCardByName.mockResolvedValue({
                id: 'commander-scryfall-id',
                oracle_text: '',
                keywords: []
            });

            render(<SignUp />);
            await waitFor(() => {
                expect(screen.getByLabelText(/select a league/i)).toBeInTheDocument();
            });

            fireEvent.change(screen.getByLabelText(/select a league/i), { target: { value: '1' } });

            const commanderInput = screen.getByLabelText(/^commander$/i);
            fireEvent.change(commanderInput, { target: { value: 'Ken' } });

            await waitFor(() => {
                expect(screen.getByText('Kenrith, the Returned King')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Kenrith, the Returned King'));

            // Wait for getCardByName to be called after selection
            await waitFor(() => {
                expect(mockGetCardByName).toHaveBeenCalledWith('Kenrith, the Returned King');
            });

            fireEvent.change(screen.getByLabelText(/decklist url/i), { target: { value: 'https://archidekt.com/decks/123' } });

            fireEvent.submit(screen.getByRole('button', { name: /sign up/i }));

            await waitFor(() => {
                expect(requestSignupForLeague).toHaveBeenCalled();
            });

            // Verify the call was made with required fields
            const callArgs = requestSignupForLeague.mock.calls[0][0];
            expect(callArgs.league_id).toBe(1);
            expect(callArgs.deck_id).toBe('deck-123');
        });

        it('should show submitting state while signing up', async () => {
            requestSignupForLeague.mockImplementation(() => new Promise(() => {})); // Never resolves

            render(<SignUp />);
            await waitFor(() => {
                expect(screen.getByLabelText(/select a league/i)).toBeInTheDocument();
            });

            fireEvent.change(screen.getByLabelText(/select a league/i), { target: { value: '1' } });
            fireEvent.change(screen.getByLabelText(/^commander$/i), { target: { value: 'Kenrith' } });
            fireEvent.change(screen.getByLabelText(/decklist url/i), { target: { value: 'https://archidekt.com/decks/123' } });

            fireEvent.submit(screen.getByRole('button', { name: /sign up/i }));

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /signing up/i })).toBeDisabled();
            });
        });

        it('should disable select during submission', async () => {
            requestSignupForLeague.mockImplementation(() => new Promise(() => {}));

            render(<SignUp />);
            await waitFor(() => {
                expect(screen.getByLabelText(/select a league/i)).toBeInTheDocument();
            });

            fireEvent.change(screen.getByLabelText(/select a league/i), { target: { value: '1' } });
            fireEvent.change(screen.getByLabelText(/^commander$/i), { target: { value: 'Kenrith' } });
            fireEvent.change(screen.getByLabelText(/decklist url/i), { target: { value: 'https://archidekt.com/decks/123' } });

            fireEvent.submit(screen.getByRole('button', { name: /sign up/i }));

            await waitFor(() => {
                expect(screen.getByLabelText(/select a league/i)).toBeDisabled();
            });
        });

        it('should display pending message after successful signup', async () => {
            render(<SignUp />);
            await waitFor(() => {
                expect(screen.getByLabelText(/select a league/i)).toBeInTheDocument();
            });

            fireEvent.change(screen.getByLabelText(/select a league/i), { target: { value: '1' } });
            fireEvent.change(screen.getByLabelText(/^commander$/i), { target: { value: 'Kenrith' } });
            fireEvent.change(screen.getByLabelText(/decklist url/i), { target: { value: 'https://archidekt.com/decks/123' } });

            fireEvent.submit(screen.getByRole('button', { name: /sign up/i }));

            // After successful signup, the component shows the pending request view
            await waitFor(() => {
                expect(screen.getByText(/You already have a pending signup request/i)).toBeInTheDocument();
            });
        });

        it('should set pending request true after successful signup', async () => {
            render(<SignUp />);
            await waitFor(() => {
                expect(screen.getByLabelText(/select a league/i)).toBeInTheDocument();
            });

            fireEvent.change(screen.getByLabelText(/select a league/i), { target: { value: '1' } });
            fireEvent.change(screen.getByLabelText(/^commander$/i), { target: { value: 'Kenrith' } });
            fireEvent.change(screen.getByLabelText(/decklist url/i), { target: { value: 'https://archidekt.com/decks/123' } });

            fireEvent.submit(screen.getByRole('button', { name: /sign up/i }));

            await waitFor(() => {
                expect(screen.getByText(/You already have a pending signup request/i)).toBeInTheDocument();
            });
        });

        it('should display error message on signup failure', async () => {
            requestSignupForLeague.mockRejectedValue(new Error('Signup failed'));

            render(<SignUp />);
            await waitFor(() => {
                expect(screen.getByLabelText(/select a league/i)).toBeInTheDocument();
            });

            fireEvent.change(screen.getByLabelText(/select a league/i), { target: { value: '1' } });
            fireEvent.change(screen.getByLabelText(/^commander$/i), { target: { value: 'Kenrith' } });
            fireEvent.change(screen.getByLabelText(/decklist url/i), { target: { value: 'https://archidekt.com/decks/123' } });

            fireEvent.submit(screen.getByRole('button', { name: /sign up/i }));

            await waitFor(() => {
                expect(screen.getByText(/Error signing up for the league/i)).toBeInTheDocument();
            });
        });
    });

    describe('Error handling', () => {
        it('should handle getLeagues API error gracefully', async () => {
            getLeagues.mockRejectedValue(new Error('API Error'));
            render(<SignUp />);
            await waitFor(() => {
                // Should render form but with empty league list
                expect(screen.getByLabelText(/select a league/i)).toBeInTheDocument();
            });
        });

        it('should handle getUserPendingSignupRequests API error gracefully', async () => {
            getUserPendingSignupRequests.mockRejectedValue(new Error('API Error'));
            render(<SignUp />);
            await waitFor(() => {
                // Should render form normally
                expect(screen.getByLabelText(/select a league/i)).toBeInTheDocument();
            });
        });

        it('should handle getCardByName error for commander', async () => {
            mockGetCardByName.mockRejectedValue(new Error('Card not found'));

            render(<SignUp />);
            await waitFor(() => {
                expect(screen.getByLabelText(/^commander$/i)).toBeInTheDocument();
            });

            const input = screen.getByLabelText(/^commander$/i);
            fireEvent.change(input, { target: { value: 'Ken' } });

            await waitFor(() => {
                expect(screen.getByText('Kenrith, the Returned King')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Kenrith, the Returned King'));

            // Should not show partner field if error occurred
            await waitFor(() => {
                expect(screen.queryByLabelText(/commander partner/i)).not.toBeInTheDocument();
            });
        });

        it('should handle autocomplete error gracefully', async () => {
            mockAutocomplete.mockRejectedValue(new Error('Autocomplete failed'));

            render(<SignUp />);
            await waitFor(() => {
                expect(screen.getByLabelText(/^commander$/i)).toBeInTheDocument();
            });

            const input = screen.getByLabelText(/^commander$/i);
            fireEvent.change(input, { target: { value: 'Ken' } });

            // Should not crash, suggestions just won't appear
            await waitFor(() => {
                expect(screen.queryByText('Kenrith, the Returned King')).not.toBeInTheDocument();
            });
        });
    });
});
