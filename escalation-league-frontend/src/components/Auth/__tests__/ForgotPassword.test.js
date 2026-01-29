import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ForgotPassword from '../ForgotPassword';

// Mock the API
jest.mock('../../../api/authApi', () => ({
    requestPasswordReset: jest.fn()
}));

// Mock TurnstileWidget to automatically provide a token
jest.mock('../TurnstileWidget', () => {
    const MockTurnstile = require('react').forwardRef(({ onVerify }, ref) => {
        const React = require('react');
        React.useEffect(() => {
            // Simulate successful verification
            onVerify('test-turnstile-token');
        }, [onVerify]);

        React.useImperativeHandle(ref, () => ({
            reset: jest.fn()
        }));

        return React.createElement('div', { 'data-testid': 'turnstile-widget' }, 'Turnstile Widget');
    });
    MockTurnstile.displayName = 'MockTurnstileWidget';
    return MockTurnstile;
});

const { requestPasswordReset } = require('../../../api/authApi');

describe('ForgotPassword', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('initial rendering', () => {
        it('should render Reset Password title', () => {
            render(<ForgotPassword />);
            expect(screen.getByRole('heading', { name: /Reset Password/i })).toBeInTheDocument();
        });

        it('should render email input', () => {
            render(<ForgotPassword />);
            expect(screen.getByPlaceholderText(/Email address/i)).toBeInTheDocument();
        });

        it('should render submit button', () => {
            render(<ForgotPassword />);
            expect(screen.getByRole('button', { name: /Send Reset Link/i })).toBeInTheDocument();
        });

        it('should render sign in link', () => {
            render(<ForgotPassword />);
            expect(screen.getByRole('link', { name: /Sign In/i })).toBeInTheDocument();
        });

        it('should render logo image', () => {
            render(<ForgotPassword />);
            expect(screen.getByAltText('Escalation League')).toBeInTheDocument();
        });
    });

    describe('form interaction', () => {
        it('should update email on input change', () => {
            render(<ForgotPassword />);
            const emailInput = screen.getByPlaceholderText(/Email address/i);

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

            expect(emailInput).toHaveValue('test@example.com');
        });

        it('should enable submit button when turnstile is verified', () => {
            render(<ForgotPassword />);
            const submitButton = screen.getByRole('button', { name: /Send Reset Link/i });

            expect(submitButton).not.toBeDisabled();
        });
    });

    describe('form submission', () => {
        it('should call requestPasswordReset on submit', async () => {
            requestPasswordReset.mockResolvedValueOnce({});

            render(<ForgotPassword />);
            const emailInput = screen.getByPlaceholderText(/Email address/i);
            const submitButton = screen.getByRole('button', { name: /Send Reset Link/i });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(requestPasswordReset).toHaveBeenCalledWith('test@example.com', 'test-turnstile-token');
            });
        });

        it('should show success message after successful submission', async () => {
            requestPasswordReset.mockResolvedValueOnce({});

            render(<ForgotPassword />);
            const emailInput = screen.getByPlaceholderText(/Email address/i);
            const submitButton = screen.getByRole('button', { name: /Send Reset Link/i });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByRole('heading', { name: /Check Your Email/i })).toBeInTheDocument();
            });
        });

        it('should display the submitted email in success message', async () => {
            requestPasswordReset.mockResolvedValueOnce({});

            render(<ForgotPassword />);
            const emailInput = screen.getByPlaceholderText(/Email address/i);
            const submitButton = screen.getByRole('button', { name: /Send Reset Link/i });

            fireEvent.change(emailInput, { target: { value: 'user@test.com' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/user@test.com/)).toBeInTheDocument();
            });
        });

        it('should show loading state while submitting', async () => {
            requestPasswordReset.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

            render(<ForgotPassword />);
            const emailInput = screen.getByPlaceholderText(/Email address/i);
            const submitButton = screen.getByRole('button', { name: /Send Reset Link/i });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.click(submitButton);

            expect(screen.getByText(/Sending.../i)).toBeInTheDocument();
        });
    });

    describe('error handling', () => {
        it('should show error message on API failure', async () => {
            requestPasswordReset.mockRejectedValueOnce({
                response: { data: { error: 'Something went wrong' } }
            });

            render(<ForgotPassword />);
            const emailInput = screen.getByPlaceholderText(/Email address/i);
            const submitButton = screen.getByRole('button', { name: /Send Reset Link/i });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText('Something went wrong')).toBeInTheDocument();
            });
        });

        it('should show generic error when no specific error message', async () => {
            requestPasswordReset.mockRejectedValueOnce(new Error('Network error'));

            render(<ForgotPassword />);
            const emailInput = screen.getByPlaceholderText(/Email address/i);
            const submitButton = screen.getByRole('button', { name: /Send Reset Link/i });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/An error occurred/i)).toBeInTheDocument();
            });
        });

        it('should clear error when user starts typing', async () => {
            requestPasswordReset.mockRejectedValueOnce({
                response: { data: { error: 'Error message' } }
            });

            render(<ForgotPassword />);
            const emailInput = screen.getByPlaceholderText(/Email address/i);
            const submitButton = screen.getByRole('button', { name: /Send Reset Link/i });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText('Error message')).toBeInTheDocument();
            });

            fireEvent.change(emailInput, { target: { value: 'new@example.com' } });

            expect(screen.queryByText('Error message')).not.toBeInTheDocument();
        });
    });

    describe('success state', () => {
        it('should render back to sign in link', async () => {
            requestPasswordReset.mockResolvedValueOnce({});

            render(<ForgotPassword />);
            const emailInput = screen.getByPlaceholderText(/Email address/i);
            const submitButton = screen.getByRole('button', { name: /Send Reset Link/i });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByRole('link', { name: /Back to Sign In/i })).toBeInTheDocument();
            });
        });

        it('should show expiry information', async () => {
            requestPasswordReset.mockResolvedValueOnce({});

            render(<ForgotPassword />);
            const emailInput = screen.getByPlaceholderText(/Email address/i);
            const submitButton = screen.getByRole('button', { name: /Send Reset Link/i });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/expire in 1 hour/i)).toBeInTheDocument();
            });
        });
    });
});
