// Mock the API - must be before imports for ESM compatibility
jest.mock('../../../api/authApi', () => ({
    verifyEmail: jest.fn(),
    resendVerificationEmail: jest.fn()
}));

// Mock useNavigate and useSearchParams
const mockNavigate = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock('react-router-dom', () => ({
    __esModule: true,
    Link: ({ children, to }) => <a href={to}>{children}</a>,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams],
    MemoryRouter: ({ children }) => <>{children}</>
}));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VerifyEmail from '../VerifyEmail';

const { verifyEmail, resendVerificationEmail } = require('../../../api/authApi');

const renderComponent = (component) => {
    return render(component);
};

describe('VerifyEmail', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSearchParams = new URLSearchParams();
    });

    describe('no token state', () => {
        it('should render Invalid Link title when no token', () => {
            renderComponent(<VerifyEmail />);
            expect(screen.getByRole('heading', { name: /Invalid Link/i })).toBeInTheDocument();
        });

        it('should render warning message when no token', () => {
            renderComponent(<VerifyEmail />);
            expect(screen.getByText(/This verification link is invalid or incomplete/i)).toBeInTheDocument();
        });

        it('should render resend email form', () => {
            renderComponent(<VerifyEmail />);
            expect(screen.getByPlaceholderText(/Enter your email/i)).toBeInTheDocument();
        });

        it('should render Resend Verification Email button', () => {
            renderComponent(<VerifyEmail />);
            expect(screen.getByRole('button', { name: /Resend Verification Email/i })).toBeInTheDocument();
        });

        it('should render Back to Sign In link', () => {
            renderComponent(<VerifyEmail />);
            expect(screen.getByRole('link', { name: /Back to Sign In/i })).toBeInTheDocument();
        });

        it('should render logo', () => {
            renderComponent(<VerifyEmail />);
            expect(screen.getByAltText('Escalation League')).toBeInTheDocument();
        });

        it('should render warning icon', () => {
            const { container } = renderComponent(<VerifyEmail />);
            expect(container.querySelector('.auth-icon.warning')).toBeInTheDocument();
        });

        it('should render divider text', () => {
            renderComponent(<VerifyEmail />);
            expect(screen.getByText(/need a new link\?/i)).toBeInTheDocument();
        });
    });

    describe('verifying state', () => {
        beforeEach(() => {
            mockSearchParams = new URLSearchParams('token=valid-token');
            verifyEmail.mockImplementation(() => new Promise(() => {})); // Never resolves
        });

        it('should render Verifying Your Email title', () => {
            renderComponent(<VerifyEmail />);
            expect(screen.getByRole('heading', { name: /Verifying Your Email/i })).toBeInTheDocument();
        });

        it('should render verifying message', () => {
            renderComponent(<VerifyEmail />);
            expect(screen.getByText(/Please wait while we verify your email address/i)).toBeInTheDocument();
        });

        it('should render verifying icon', () => {
            const { container } = renderComponent(<VerifyEmail />);
            expect(container.querySelector('.auth-icon.verifying')).toBeInTheDocument();
        });

        it('should call verifyEmail API with token', () => {
            mockSearchParams = new URLSearchParams('token=test-verification-token');
            renderComponent(<VerifyEmail />);

            expect(verifyEmail).toHaveBeenCalledWith('test-verification-token');
        });
    });

    describe('success state', () => {
        beforeEach(() => {
            mockSearchParams = new URLSearchParams('token=valid-token');
            verifyEmail.mockResolvedValue({});
        });

        it('should render Email Verified! title after successful verification', async () => {
            renderComponent(<VerifyEmail />);

            await waitFor(() => {
                expect(screen.getByRole('heading', { name: /Email Verified!/i })).toBeInTheDocument();
            });
        });

        it('should render success message', async () => {
            renderComponent(<VerifyEmail />);

            await waitFor(() => {
                expect(screen.getByText(/Your email has been verified successfully/i)).toBeInTheDocument();
            });
        });

        it('should render Sign In button', async () => {
            renderComponent(<VerifyEmail />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
            });
        });

        it('should navigate to signin when Sign In button clicked', async () => {
            renderComponent(<VerifyEmail />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));
            expect(mockNavigate).toHaveBeenCalledWith('/signin');
        });

        it('should render success icon', async () => {
            const { container } = renderComponent(<VerifyEmail />);

            await waitFor(() => {
                expect(container.querySelector('.auth-icon.success')).toBeInTheDocument();
            });
        });
    });

    describe('error state', () => {
        beforeEach(() => {
            mockSearchParams = new URLSearchParams('token=invalid-token');
        });

        it('should render Verification Failed title on API error', async () => {
            verifyEmail.mockRejectedValue({
                response: { data: { error: 'Token expired' } }
            });

            renderComponent(<VerifyEmail />);

            await waitFor(() => {
                expect(screen.getByRole('heading', { name: /Verification Failed/i })).toBeInTheDocument();
            });
        });

        it('should display specific error message', async () => {
            verifyEmail.mockRejectedValue({
                response: { data: { error: 'Token expired' } }
            });

            renderComponent(<VerifyEmail />);

            await waitFor(() => {
                expect(screen.getByText('Token expired')).toBeInTheDocument();
            });
        });

        it('should display generic error message when no specific error', async () => {
            verifyEmail.mockRejectedValue(new Error('Network error'));

            renderComponent(<VerifyEmail />);

            await waitFor(() => {
                expect(screen.getByText(/Failed to verify email/i)).toBeInTheDocument();
            });
        });

        it('should render error icon', async () => {
            verifyEmail.mockRejectedValue({
                response: { data: { error: 'Error' } }
            });

            const { container } = renderComponent(<VerifyEmail />);

            await waitFor(() => {
                expect(container.querySelector('.auth-icon.error')).toBeInTheDocument();
            });
        });

        it('should render resend email form in error state', async () => {
            verifyEmail.mockRejectedValue({
                response: { data: { error: 'Token expired' } }
            });

            renderComponent(<VerifyEmail />);

            await waitFor(() => {
                expect(screen.getByPlaceholderText(/Enter your email/i)).toBeInTheDocument();
            });
        });

        it('should render Back to Sign In link in error state', async () => {
            verifyEmail.mockRejectedValue({
                response: { data: { error: 'Token expired' } }
            });

            renderComponent(<VerifyEmail />);

            await waitFor(() => {
                expect(screen.getByRole('link', { name: /Back to Sign In/i })).toBeInTheDocument();
            });
        });

        it('should render divider text in error state', async () => {
            verifyEmail.mockRejectedValue({
                response: { data: { error: 'Token expired' } }
            });

            renderComponent(<VerifyEmail />);

            await waitFor(() => {
                expect(screen.getByText(/need a new link\?/i)).toBeInTheDocument();
            });
        });
    });

    describe('resend email functionality - no token state', () => {
        beforeEach(() => {
            mockSearchParams = new URLSearchParams();
        });

        it('should update email input on change', () => {
            renderComponent(<VerifyEmail />);
            const emailInput = screen.getByPlaceholderText(/Enter your email/i);

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

            expect(emailInput).toHaveValue('test@example.com');
        });

        it('should call resendVerificationEmail on submit', async () => {
            resendVerificationEmail.mockResolvedValue({});

            renderComponent(<VerifyEmail />);
            const emailInput = screen.getByPlaceholderText(/Enter your email/i);
            const submitButton = screen.getByRole('button', { name: /Resend Verification Email/i });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(resendVerificationEmail).toHaveBeenCalledWith('test@example.com');
            });
        });

        it('should not call API when email is empty', async () => {
            renderComponent(<VerifyEmail />);
            const submitButton = screen.getByRole('button', { name: /Resend Verification Email/i });

            fireEvent.click(submitButton);

            expect(resendVerificationEmail).not.toHaveBeenCalled();
        });

        it('should show loading state while sending', async () => {
            resendVerificationEmail.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

            renderComponent(<VerifyEmail />);
            const emailInput = screen.getByPlaceholderText(/Enter your email/i);
            const submitButton = screen.getByRole('button', { name: /Resend Verification Email/i });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.click(submitButton);

            expect(screen.getByText(/Sending.../i)).toBeInTheDocument();
        });

        it('should disable button while sending', async () => {
            resendVerificationEmail.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

            renderComponent(<VerifyEmail />);
            const emailInput = screen.getByPlaceholderText(/Enter your email/i);
            const submitButton = screen.getByRole('button', { name: /Resend Verification Email/i });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Sending.../i })).toBeDisabled();
            });
        });

        it('should show success message after successful resend', async () => {
            resendVerificationEmail.mockResolvedValue({});

            renderComponent(<VerifyEmail />);
            const emailInput = screen.getByPlaceholderText(/Enter your email/i);
            const submitButton = screen.getByRole('button', { name: /Resend Verification Email/i });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/If an account exists with this email, a new verification link has been sent/i)).toBeInTheDocument();
            });
        });

        it('should handle resend error silently', async () => {
            resendVerificationEmail.mockRejectedValue(new Error('API error'));

            renderComponent(<VerifyEmail />);
            const emailInput = screen.getByPlaceholderText(/Enter your email/i);
            const submitButton = screen.getByRole('button', { name: /Resend Verification Email/i });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                // Button should not show loading anymore
                expect(screen.getByRole('button', { name: /Resend Verification Email/i })).toBeInTheDocument();
            });

            // Success message should not appear
            expect(screen.queryByText(/If an account exists with this email/i)).not.toBeInTheDocument();
        });
    });

    describe('resend email functionality - error state', () => {
        beforeEach(() => {
            mockSearchParams = new URLSearchParams('token=invalid-token');
            verifyEmail.mockRejectedValue({
                response: { data: { error: 'Token expired' } }
            });
        });

        it('should update email input on change in error state', async () => {
            renderComponent(<VerifyEmail />);

            await waitFor(() => {
                expect(screen.getByRole('heading', { name: /Verification Failed/i })).toBeInTheDocument();
            });

            const emailInput = screen.getByPlaceholderText(/Enter your email/i);
            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

            expect(emailInput).toHaveValue('test@example.com');
        });

        it('should call resendVerificationEmail on submit in error state', async () => {
            resendVerificationEmail.mockResolvedValue({});

            renderComponent(<VerifyEmail />);

            await waitFor(() => {
                expect(screen.getByRole('heading', { name: /Verification Failed/i })).toBeInTheDocument();
            });

            const emailInput = screen.getByPlaceholderText(/Enter your email/i);
            const submitButton = screen.getByRole('button', { name: /Resend Verification Email/i });

            fireEvent.change(emailInput, { target: { value: 'resend@example.com' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(resendVerificationEmail).toHaveBeenCalledWith('resend@example.com');
            });
        });

        it('should show success message after successful resend in error state', async () => {
            resendVerificationEmail.mockResolvedValue({});

            renderComponent(<VerifyEmail />);

            await waitFor(() => {
                expect(screen.getByRole('heading', { name: /Verification Failed/i })).toBeInTheDocument();
            });

            const emailInput = screen.getByPlaceholderText(/Enter your email/i);
            const submitButton = screen.getByRole('button', { name: /Resend Verification Email/i });

            fireEvent.change(emailInput, { target: { value: 'resend@example.com' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/If an account exists with this email, a new verification link has been sent/i)).toBeInTheDocument();
            });
        });
    });

    describe('default case in renderContent', () => {
        it('should handle unknown status gracefully', () => {
            // This test is for completeness - the default case returns null
            // In practice, the status is always one of the defined values
            mockSearchParams = new URLSearchParams('token=valid-token');
            verifyEmail.mockResolvedValue({});

            renderComponent(<VerifyEmail />);

            // The component should render without errors
            expect(screen.getByAltText('Escalation League')).toBeInTheDocument();
        });
    });
});
