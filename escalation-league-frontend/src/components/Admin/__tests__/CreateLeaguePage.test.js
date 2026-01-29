// Mock dependencies BEFORE importing modules
const mockNavigate = jest.fn();
const mockShowToast = jest.fn();

jest.mock('react-router-dom', () => ({
    Link: ({ children, to }) => <a href={to}>{children}</a>,
    NavLink: ({ children, to }) => <a href={to}>{children}</a>,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/', search: '', state: null }),
    useParams: () => ({}),
    MemoryRouter: ({ children }) => <>{children}</>,
    BrowserRouter: ({ children }) => <>{children}</>
}));

jest.mock('../../../context/ToastContext', () => ({
    useToast: () => ({ showToast: mockShowToast })
}));

jest.mock('../../../api/leaguesApi', () => ({
    createLeague: jest.fn()
}));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import CreateLeaguePage from '../CreateLeaguePage';

import { createLeague } from '../../../api/leaguesApi';

const renderWithRouter = (component) => {
    return render(
        <BrowserRouter>
            {component}
        </BrowserRouter>
    );
};

// Helper to get input by placeholder text
const getNameInput = () => screen.getByPlaceholderText('Name');
const getWeeksInput = () => screen.getByPlaceholderText('Number of Weeks');
const getDescriptionInput = () => screen.getByPlaceholderText('Description');
const getMaxPlayersInput = () => screen.getByPlaceholderText('Max Players');
const getBudgetInput = () => screen.getByPlaceholderText('Weekly Budget');
const getCodeInput = () => screen.getByPlaceholderText('League Code');

describe('CreateLeaguePage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        createLeague.mockResolvedValue({ id: 1 });
    });

    describe('Rendering', () => {
        it('should render the page title', () => {
            renderWithRouter(<CreateLeaguePage />);
            expect(screen.getByRole('heading', { name: /create league/i })).toBeInTheDocument();
        });

        it('should render name input', () => {
            renderWithRouter(<CreateLeaguePage />);
            expect(getNameInput()).toBeInTheDocument();
        });

        it('should render start date input', () => {
            renderWithRouter(<CreateLeaguePage />);
            const dateInput = document.querySelector('input[type="date"]');
            expect(dateInput).toBeInTheDocument();
        });

        it('should render number of weeks input', () => {
            renderWithRouter(<CreateLeaguePage />);
            expect(getWeeksInput()).toBeInTheDocument();
        });

        it('should render description textarea', () => {
            renderWithRouter(<CreateLeaguePage />);
            expect(getDescriptionInput()).toBeInTheDocument();
        });

        it('should render max players input', () => {
            renderWithRouter(<CreateLeaguePage />);
            expect(getMaxPlayersInput()).toBeInTheDocument();
        });

        it('should render weekly budget input', () => {
            renderWithRouter(<CreateLeaguePage />);
            expect(getBudgetInput()).toBeInTheDocument();
        });

        it('should render league code input', () => {
            renderWithRouter(<CreateLeaguePage />);
            expect(getCodeInput()).toBeInTheDocument();
        });

        it('should render Create League button', () => {
            renderWithRouter(<CreateLeaguePage />);
            expect(screen.getByRole('button', { name: /create league/i })).toBeInTheDocument();
        });

        it('should render Cancel button', () => {
            renderWithRouter(<CreateLeaguePage />);
            expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
        });
    });

    describe('Form Inputs', () => {
        it('should update name field on input', async () => {
            renderWithRouter(<CreateLeaguePage />);

            const nameInput = getNameInput();
            await userEvent.type(nameInput, 'Test League');

            expect(nameInput.value).toBe('Test League');
        });

        it('should update start date field on input', async () => {
            renderWithRouter(<CreateLeaguePage />);

            const startDateInput = document.querySelector('input[type="date"]');
            fireEvent.change(startDateInput, { target: { value: '2024-01-15' } });

            expect(startDateInput.value).toBe('2024-01-15');
        });

        it('should update number of weeks field on input', async () => {
            renderWithRouter(<CreateLeaguePage />);

            const weeksInput = getWeeksInput();
            await userEvent.type(weeksInput, '8');

            expect(weeksInput.value).toBe('8');
        });

        it('should update description field on input', async () => {
            renderWithRouter(<CreateLeaguePage />);

            const descriptionInput = getDescriptionInput();
            await userEvent.type(descriptionInput, 'A test description');

            expect(descriptionInput.value).toBe('A test description');
        });

        it('should update max players field on input', async () => {
            renderWithRouter(<CreateLeaguePage />);

            const maxPlayersInput = getMaxPlayersInput();
            await userEvent.type(maxPlayersInput, '16');

            expect(maxPlayersInput.value).toBe('16');
        });

        it('should update weekly budget field on input', async () => {
            renderWithRouter(<CreateLeaguePage />);

            const budgetInput = getBudgetInput();
            await userEvent.type(budgetInput, '50');

            expect(budgetInput.value).toBe('50');
        });

        it('should update league code field on input', async () => {
            renderWithRouter(<CreateLeaguePage />);

            const codeInput = getCodeInput();
            await userEvent.type(codeInput, 'TESTCODE');

            expect(codeInput.value).toBe('TESTCODE');
        });
    });

    describe('Form Submission', () => {
        it('should call createLeague with form data on submit', async () => {
            renderWithRouter(<CreateLeaguePage />);

            await userEvent.type(getNameInput(), 'Test League');
            fireEvent.change(document.querySelector('input[type="date"]'), { target: { value: '2024-01-15' } });
            await userEvent.type(getWeeksInput(), '8');
            await userEvent.type(getMaxPlayersInput(), '16');
            await userEvent.type(getBudgetInput(), '50');
            await userEvent.type(getCodeInput(), 'TEST');

            fireEvent.click(screen.getByRole('button', { name: /create league/i }));

            await waitFor(() => {
                expect(createLeague).toHaveBeenCalled();
            });
        });

        it('should calculate end date based on start date and weeks', async () => {
            renderWithRouter(<CreateLeaguePage />);

            await userEvent.type(getNameInput(), 'Test League');
            fireEvent.change(document.querySelector('input[type="date"]'), { target: { value: '2024-01-01' } });
            await userEvent.type(getWeeksInput(), '8');
            await userEvent.type(getMaxPlayersInput(), '16');
            await userEvent.type(getBudgetInput(), '50');
            await userEvent.type(getCodeInput(), 'TEST');

            fireEvent.click(screen.getByRole('button', { name: /create league/i }));

            await waitFor(() => {
                expect(createLeague).toHaveBeenCalledWith(
                    expect.objectContaining({
                        end_date: expect.stringMatching(/2024-02-\d{2}/)
                    })
                );
            });
        });

        it('should show success toast on successful creation', async () => {
            renderWithRouter(<CreateLeaguePage />);

            await userEvent.type(getNameInput(), 'Test League');
            fireEvent.change(document.querySelector('input[type="date"]'), { target: { value: '2024-01-15' } });
            await userEvent.type(getWeeksInput(), '8');
            await userEvent.type(getMaxPlayersInput(), '16');
            await userEvent.type(getBudgetInput(), '50');
            await userEvent.type(getCodeInput(), 'TEST');

            fireEvent.click(screen.getByRole('button', { name: /create league/i }));

            await waitFor(() => {
                expect(mockShowToast).toHaveBeenCalledWith('League created successfully!', 'success');
            });
        });

        it('should navigate to leagues page on successful creation', async () => {
            renderWithRouter(<CreateLeaguePage />);

            await userEvent.type(getNameInput(), 'Test League');
            fireEvent.change(document.querySelector('input[type="date"]'), { target: { value: '2024-01-15' } });
            await userEvent.type(getWeeksInput(), '8');
            await userEvent.type(getMaxPlayersInput(), '16');
            await userEvent.type(getBudgetInput(), '50');
            await userEvent.type(getCodeInput(), 'TEST');

            fireEvent.click(screen.getByRole('button', { name: /create league/i }));

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/admin/leagues');
            });
        });

        it('should show error toast on failed creation', async () => {
            createLeague.mockRejectedValue(new Error('Network error'));

            renderWithRouter(<CreateLeaguePage />);

            await userEvent.type(getNameInput(), 'Test League');
            fireEvent.change(document.querySelector('input[type="date"]'), { target: { value: '2024-01-15' } });
            await userEvent.type(getWeeksInput(), '8');
            await userEvent.type(getMaxPlayersInput(), '16');
            await userEvent.type(getBudgetInput(), '50');
            await userEvent.type(getCodeInput(), 'TEST');

            fireEvent.click(screen.getByRole('button', { name: /create league/i }));

            await waitFor(() => {
                expect(mockShowToast).toHaveBeenCalledWith('Failed to create league. Please try again.', 'error');
            });
        });

        it('should not navigate on failed creation', async () => {
            createLeague.mockRejectedValue(new Error('Network error'));

            renderWithRouter(<CreateLeaguePage />);

            await userEvent.type(getNameInput(), 'Test League');
            fireEvent.change(document.querySelector('input[type="date"]'), { target: { value: '2024-01-15' } });
            await userEvent.type(getWeeksInput(), '8');
            await userEvent.type(getMaxPlayersInput(), '16');
            await userEvent.type(getBudgetInput(), '50');
            await userEvent.type(getCodeInput(), 'TEST');

            fireEvent.click(screen.getByRole('button', { name: /create league/i }));

            await waitFor(() => {
                expect(mockShowToast).toHaveBeenCalledWith('Failed to create league. Please try again.', 'error');
            });

            // Navigate should not have been called for success
            expect(mockNavigate).not.toHaveBeenCalledWith('/admin/leagues');
        });
    });

    describe('Cancel Button', () => {
        it('should navigate to leagues page when Cancel is clicked', async () => {
            renderWithRouter(<CreateLeaguePage />);

            fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

            expect(mockNavigate).toHaveBeenCalledWith('/admin/leagues');
        });
    });

    describe('Form Validation', () => {
        it('should have required attribute on name input', () => {
            renderWithRouter(<CreateLeaguePage />);
            expect(getNameInput()).toHaveAttribute('required');
        });

        it('should have required attribute on start date input', () => {
            renderWithRouter(<CreateLeaguePage />);
            expect(document.querySelector('input[type="date"]')).toHaveAttribute('required');
        });

        it('should have required attribute on number of weeks input', () => {
            renderWithRouter(<CreateLeaguePage />);
            expect(getWeeksInput()).toHaveAttribute('required');
        });

        it('should have required attribute on max players input', () => {
            renderWithRouter(<CreateLeaguePage />);
            expect(getMaxPlayersInput()).toHaveAttribute('required');
        });

        it('should have required attribute on weekly budget input', () => {
            renderWithRouter(<CreateLeaguePage />);
            expect(getBudgetInput()).toHaveAttribute('required');
        });

        it('should have required attribute on league code input', () => {
            renderWithRouter(<CreateLeaguePage />);
            expect(getCodeInput()).toHaveAttribute('required');
        });

        it('should not have required attribute on description textarea', () => {
            renderWithRouter(<CreateLeaguePage />);
            expect(getDescriptionInput()).not.toHaveAttribute('required');
        });
    });

    describe('Input Types', () => {
        it('should have text type for name input', () => {
            renderWithRouter(<CreateLeaguePage />);
            expect(getNameInput()).toHaveAttribute('type', 'text');
        });

        it('should have date type for start date input', () => {
            renderWithRouter(<CreateLeaguePage />);
            expect(document.querySelector('input[type="date"]')).toHaveAttribute('type', 'date');
        });

        it('should have number type for weeks input', () => {
            renderWithRouter(<CreateLeaguePage />);
            expect(getWeeksInput()).toHaveAttribute('type', 'number');
        });

        it('should have number type for max players input', () => {
            renderWithRouter(<CreateLeaguePage />);
            expect(getMaxPlayersInput()).toHaveAttribute('type', 'number');
        });

        it('should have number type for weekly budget input', () => {
            renderWithRouter(<CreateLeaguePage />);
            expect(getBudgetInput()).toHaveAttribute('type', 'number');
        });

        it('should have text type for league code input', () => {
            renderWithRouter(<CreateLeaguePage />);
            expect(getCodeInput()).toHaveAttribute('type', 'text');
        });
    });

    describe('Form Container', () => {
        it('should have container with mt-4 class', () => {
            const { container } = renderWithRouter(<CreateLeaguePage />);
            expect(container.querySelector('.container.mt-4')).toBeInTheDocument();
        });

        it('should have form element', () => {
            renderWithRouter(<CreateLeaguePage />);
            // Form elements without explicit role may not be found by getByRole
            expect(document.querySelector('form')).toBeInTheDocument();
        });
    });

    describe('Initial State', () => {
        it('should have empty name field initially', () => {
            renderWithRouter(<CreateLeaguePage />);
            expect(getNameInput().value).toBe('');
        });

        it('should have empty start date field initially', () => {
            renderWithRouter(<CreateLeaguePage />);
            expect(document.querySelector('input[type="date"]').value).toBe('');
        });

        it('should have empty number of weeks field initially', () => {
            renderWithRouter(<CreateLeaguePage />);
            expect(getWeeksInput().value).toBe('');
        });

        it('should have empty description field initially', () => {
            renderWithRouter(<CreateLeaguePage />);
            expect(getDescriptionInput().value).toBe('');
        });

        it('should have empty max players field initially', () => {
            renderWithRouter(<CreateLeaguePage />);
            expect(getMaxPlayersInput().value).toBe('');
        });

        it('should have empty weekly budget field initially', () => {
            renderWithRouter(<CreateLeaguePage />);
            expect(getBudgetInput().value).toBe('');
        });

        it('should have empty league code field initially', () => {
            renderWithRouter(<CreateLeaguePage />);
            expect(getCodeInput().value).toBe('');
        });
    });

    describe('Button Styles', () => {
        it('should have primary style on Create League button', () => {
            renderWithRouter(<CreateLeaguePage />);
            expect(screen.getByRole('button', { name: /create league/i })).toHaveClass('btn-primary');
        });

        it('should have secondary style on Cancel button', () => {
            renderWithRouter(<CreateLeaguePage />);
            expect(screen.getByRole('button', { name: /cancel/i })).toHaveClass('btn-secondary');
        });
    });
});
