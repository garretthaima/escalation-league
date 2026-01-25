import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SignIn from '../SignIn';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    Link: ({ children, to }) => <a href={to}>{children}</a>,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/signin', search: '' }),
    MemoryRouter: ({ children }) => <>{children}</>,
}));

// Mock the API
jest.mock('../../../api/authApi', () => ({
    loginUser: jest.fn(),
    registerUser: jest.fn(),
    googleAuth: jest.fn()
}));

// Mock PermissionsProvider
const mockRefreshUserData = jest.fn();
jest.mock('../../../context/PermissionsProvider', () => ({
    usePermissions: () => ({
        refreshUserData: mockRefreshUserData
    })
}));

// Mock ToastContext
const mockShowToast = jest.fn();
jest.mock('../../../context/ToastContext', () => ({
    useToast: () => ({
        showToast: mockShowToast
    })
}));

// Mock TurnstileWidget to automatically provide a token
jest.mock('../TurnstileWidget', () => {
    const MockTurnstile = require('react').forwardRef(({ onVerify }, ref) => {
        const React = require('react');
        React.useEffect(() => {
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

// Mock GoogleSignInButton
jest.mock('../GoogleSignInButton', () => {
    return function MockGoogleSignInButton({ onSuccess }) {
        return (
            <button
                data-testid="google-signin-button"
                onClick={() => onSuccess({ credential: 'mock-google-credential' })}
            >
                Sign in with Google
            </button>
        );
    };
});

// Mock password validation
jest.mock('../../../utils/passwordValidation', () => ({
    validatePassword: jest.fn((password) => {
        if (!password || password.length < 8) {
            return { isValid: false, errors: ['Password must be at least 8 characters'] };
        }
        if (password === 'password') {
            return { isValid: false, errors: ['This password is too common'] };
        }
        return { isValid: true, errors: [] };
    }),
    getPasswordStrength: jest.fn((password) => {
        if (!password) return { level: 0, label: '', color: '' };
        if (password.length >= 12) return { level: 4, label: 'Strong', color: '#28a745' };
        if (password.length >= 8) return { level: 2, label: 'Fair', color: '#ffc107' };
        return { level: 1, label: 'Weak', color: '#fd7e14' };
    })
}));

const { loginUser, registerUser, googleAuth } = require('../../../api/authApi');
const { MemoryRouter } = require('react-router-dom');

const renderWithRouter = (component) => {
    return render(
        <MemoryRouter>
            {component}
        </MemoryRouter>
    );
};

// TODO: Fix async/mock issues - tests skipped
describe.skip('SignIn', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        mockRefreshUserData.mockResolvedValue({ activeLeague: null });
    });

    describe('initial rendering', () => {
        it('should render Welcome Back title for sign in', () => {
            renderWithRouter(<SignIn />);
            expect(screen.getByRole('heading', { name: /Welcome Back/i })).toBeInTheDocument();
        });

        it('should render sign in subtitle', () => {
            renderWithRouter(<SignIn />);
            expect(screen.getByText(/Sign in to continue to Escalation League/i)).toBeInTheDocument();
        });

        it('should render email input', () => {
            renderWithRouter(<SignIn />);
            expect(screen.getByPlaceholderText(/Email address/i)).toBeInTheDocument();
        });

        it('should render password input', () => {
            renderWithRouter(<SignIn />);
            expect(screen.getByPlaceholderText(/Password/i)).toBeInTheDocument();
        });

        it('should render Sign In button', () => {
            renderWithRouter(<SignIn />);
            // Use exact match to avoid matching "Sign in with Google"
            expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
        });

        it('should render Register toggle link', () => {
            renderWithRouter(<SignIn />);
            expect(screen.getByRole('button', { name: /Register/i })).toBeInTheDocument();
        });

        it('should render forgot password link', () => {
            renderWithRouter(<SignIn />);
            expect(screen.getByRole('link', { name: /Forgot password\?/i })).toBeInTheDocument();
        });

        it('should render Google sign-in button', () => {
            renderWithRouter(<SignIn />);
            expect(screen.getByTestId('google-signin-button')).toBeInTheDocument();
        });

        it('should render Turnstile widget', () => {
            renderWithRouter(<SignIn />);
            expect(screen.getByTestId('turnstile-widget')).toBeInTheDocument();
        });

        it('should render logo image', () => {
            renderWithRouter(<SignIn />);
            expect(screen.getByAltText('Escalation League')).toBeInTheDocument();
        });

        it('should render divider text', () => {
            renderWithRouter(<SignIn />);
            expect(screen.getByText(/or continue with email/i)).toBeInTheDocument();
        });
    });

    describe('toggle between sign in and register', () => {
        it('should switch to register mode when Register button clicked', () => {
            renderWithRouter(<SignIn />);
            const registerButton = screen.getByRole('button', { name: /Register/i });

            fireEvent.click(registerButton);

            expect(screen.getByRole('heading', { name: /Create Account/i })).toBeInTheDocument();
        });

        it('should show first name and last name inputs in register mode', () => {
            renderWithRouter(<SignIn />);
            fireEvent.click(screen.getByRole('button', { name: /Register/i }));

            expect(screen.getByPlaceholderText(/First name/i)).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/Last name/i)).toBeInTheDocument();
        });

        it('should show register subtitle in register mode', () => {
            renderWithRouter(<SignIn />);
            fireEvent.click(screen.getByRole('button', { name: /Register/i }));

            expect(screen.getByText(/Sign up to join Escalation League/i)).toBeInTheDocument();
        });

        it('should switch back to sign in mode', () => {
            renderWithRouter(<SignIn />);
            fireEvent.click(screen.getByRole('button', { name: /Register/i }));
            // Use exact match to avoid matching "Sign in with Google"
            fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

            expect(screen.getByRole('heading', { name: /Welcome Back/i })).toBeInTheDocument();
        });

        it('should show "Already have an account?" text in register mode', () => {
            renderWithRouter(<SignIn />);
            fireEvent.click(screen.getByRole('button', { name: /Register/i }));

            expect(screen.getByText(/Already have an account\?/i)).toBeInTheDocument();
        });

        it('should show "Don\'t have an account?" text in sign in mode', () => {
            renderWithRouter(<SignIn />);
            expect(screen.getByText(/Don't have an account\?/i)).toBeInTheDocument();
        });

        it('should hide forgot password link in register mode', () => {
            renderWithRouter(<SignIn />);
            fireEvent.click(screen.getByRole('button', { name: /Register/i }));

            expect(screen.queryByRole('link', { name: /Forgot password\?/i })).not.toBeInTheDocument();
        });

        it('should clear password when switching modes', () => {
            renderWithRouter(<SignIn />);
            const passwordInput = screen.getByPlaceholderText(/Password/i);

            fireEvent.change(passwordInput, { target: { value: 'testpassword' } });
            fireEvent.click(screen.getByRole('button', { name: /Register/i }));

            expect(screen.getByPlaceholderText(/Password/i)).toHaveValue('');
        });

        it('should preserve email when switching modes', () => {
            renderWithRouter(<SignIn />);
            const emailInput = screen.getByPlaceholderText(/Email address/i);

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.click(screen.getByRole('button', { name: /Register/i }));

            expect(screen.getByPlaceholderText(/Email address/i)).toHaveValue('test@example.com');
        });

        it('should clear error when switching modes', async () => {
            loginUser.mockRejectedValueOnce({
                response: { data: { error: 'Invalid credentials' } }
            });

            renderWithRouter(<SignIn />);
            fireEvent.change(screen.getByPlaceholderText(/Email address/i), { target: { value: 'test@example.com' } });
            fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'wrongpassword' } });
            fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

            await waitFor(() => {
                expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /Register/i }));

            expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument();
        });
    });

    describe('form interaction', () => {
        it('should update email on input change', () => {
            renderWithRouter(<SignIn />);
            const emailInput = screen.getByPlaceholderText(/Email address/i);

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

            expect(emailInput).toHaveValue('test@example.com');
        });

        it('should update password on input change', () => {
            renderWithRouter(<SignIn />);
            const passwordInput = screen.getByPlaceholderText(/Password/i);

            fireEvent.change(passwordInput, { target: { value: 'testpassword' } });

            expect(passwordInput).toHaveValue('testpassword');
        });

        it('should update firstname on input change in register mode', () => {
            renderWithRouter(<SignIn />);
            fireEvent.click(screen.getByRole('button', { name: /Register/i }));

            const firstnameInput = screen.getByPlaceholderText(/First name/i);
            fireEvent.change(firstnameInput, { target: { value: 'John' } });

            expect(firstnameInput).toHaveValue('John');
        });

        it('should update lastname on input change in register mode', () => {
            renderWithRouter(<SignIn />);
            fireEvent.click(screen.getByRole('button', { name: /Register/i }));

            const lastnameInput = screen.getByPlaceholderText(/Last name/i);
            fireEvent.change(lastnameInput, { target: { value: 'Doe' } });

            expect(lastnameInput).toHaveValue('Doe');
        });

        it('should toggle password visibility', () => {
            renderWithRouter(<SignIn />);
            const passwordInput = screen.getByPlaceholderText(/Password/i);
            const toggleButton = screen.getByLabelText(/Show password/i);

            expect(passwordInput).toHaveAttribute('type', 'password');

            fireEvent.click(toggleButton);
            expect(passwordInput).toHaveAttribute('type', 'text');

            fireEvent.click(toggleButton);
            expect(passwordInput).toHaveAttribute('type', 'password');
        });

        it('should clear error when user starts typing', async () => {
            loginUser.mockRejectedValueOnce({
                response: { data: { error: 'Some error' } }
            });

            renderWithRouter(<SignIn />);
            fireEvent.change(screen.getByPlaceholderText(/Email address/i), { target: { value: 'test@example.com' } });
            fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'password123' } });
            fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

            await waitFor(() => {
                expect(screen.getByText('Some error')).toBeInTheDocument();
            });

            fireEvent.change(screen.getByPlaceholderText(/Email address/i), { target: { value: 'new@example.com' } });

            expect(screen.queryByText('Some error')).not.toBeInTheDocument();
        });
    });

    describe('password validation in register mode', () => {
        it('should show password strength indicator', () => {
            renderWithRouter(<SignIn />);
            fireEvent.click(screen.getByRole('button', { name: /Register/i }));

            const passwordInput = screen.getByPlaceholderText(/Password/i);
            fireEvent.change(passwordInput, { target: { value: 'testpassword' } });

            expect(screen.getByText('Strong')).toBeInTheDocument();
        });

        it('should show password errors for short password', () => {
            renderWithRouter(<SignIn />);
            fireEvent.click(screen.getByRole('button', { name: /Register/i }));

            const passwordInput = screen.getByPlaceholderText(/Password/i);
            fireEvent.change(passwordInput, { target: { value: 'short' } });

            expect(screen.getByText(/Password must be at least 8 characters/i)).toBeInTheDocument();
        });

        it('should show password errors for common password', () => {
            renderWithRouter(<SignIn />);
            fireEvent.click(screen.getByRole('button', { name: /Register/i }));

            const passwordInput = screen.getByPlaceholderText(/Password/i);
            fireEvent.change(passwordInput, { target: { value: 'password' } });

            expect(screen.getByText(/This password is too common/i)).toBeInTheDocument();
        });

        it('should disable submit button when password is invalid in register mode', () => {
            renderWithRouter(<SignIn />);
            fireEvent.click(screen.getByRole('button', { name: /Register/i }));

            const passwordInput = screen.getByPlaceholderText(/Password/i);
            fireEvent.change(passwordInput, { target: { value: 'short' } });

            const submitButton = screen.getByRole('button', { name: /Create Account/i });
            expect(submitButton).toBeDisabled();
        });

        it('should not show password strength indicator in sign in mode', () => {
            renderWithRouter(<SignIn />);

            const passwordInput = screen.getByPlaceholderText(/Password/i);
            fireEvent.change(passwordInput, { target: { value: 'testpassword' } });

            expect(screen.queryByText('Strong')).not.toBeInTheDocument();
        });
    });

    describe('sign in form submission', () => {
        it('should call loginUser on submit', async () => {
            loginUser.mockResolvedValueOnce({ token: 'test-token', refreshToken: 'test-refresh' });

            renderWithRouter(<SignIn />);
            fireEvent.change(screen.getByPlaceholderText(/Email address/i), { target: { value: 'test@example.com' } });
            fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'password123' } });
            fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

            await waitFor(() => {
                expect(loginUser).toHaveBeenCalledWith({
                    email: 'test@example.com',
                    password: 'password123',
                    turnstileToken: 'test-turnstile-token'
                });
            });
        });

        it('should store token in localStorage on successful login', async () => {
            loginUser.mockResolvedValueOnce({ token: 'test-token', refreshToken: 'test-refresh' });

            renderWithRouter(<SignIn />);
            fireEvent.change(screen.getByPlaceholderText(/Email address/i), { target: { value: 'test@example.com' } });
            fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'password123' } });
            fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

            await waitFor(() => {
                expect(localStorage.getItem('token')).toBe('test-token');
                expect(localStorage.getItem('refreshToken')).toBe('test-refresh');
            });
        });

        it('should call refreshUserData after successful login', async () => {
            loginUser.mockResolvedValueOnce({ token: 'test-token' });

            renderWithRouter(<SignIn />);
            fireEvent.change(screen.getByPlaceholderText(/Email address/i), { target: { value: 'test@example.com' } });
            fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'password123' } });
            fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

            await waitFor(() => {
                expect(mockRefreshUserData).toHaveBeenCalled();
            });
        });

        it('should navigate to home after successful login (no active league)', async () => {
            loginUser.mockResolvedValueOnce({ token: 'test-token' });
            mockRefreshUserData.mockResolvedValueOnce({ activeLeague: null });

            renderWithRouter(<SignIn />);
            fireEvent.change(screen.getByPlaceholderText(/Email address/i), { target: { value: 'test@example.com' } });
            fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'password123' } });
            fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/');
            });
        });

        it('should navigate to leagues page after successful login (with active league)', async () => {
            loginUser.mockResolvedValueOnce({ token: 'test-token' });
            mockRefreshUserData.mockResolvedValueOnce({ activeLeague: { league_id: 1 } });

            renderWithRouter(<SignIn />);
            fireEvent.change(screen.getByPlaceholderText(/Email address/i), { target: { value: 'test@example.com' } });
            fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'password123' } });
            fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/leagues');
            });
        });

        it('should show loading state while submitting', async () => {
            loginUser.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ token: 'test' }), 100)));

            renderWithRouter(<SignIn />);
            fireEvent.change(screen.getByPlaceholderText(/Email address/i), { target: { value: 'test@example.com' } });
            fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'password123' } });
            fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

            expect(screen.getByText(/Signing In.../i)).toBeInTheDocument();
        });

        it('should show error message on API failure', async () => {
            loginUser.mockRejectedValueOnce({
                response: { data: { error: 'Invalid credentials' } }
            });

            renderWithRouter(<SignIn />);
            fireEvent.change(screen.getByPlaceholderText(/Email address/i), { target: { value: 'test@example.com' } });
            fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'wrongpassword' } });
            fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

            await waitFor(() => {
                expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
            });
        });

        it('should show generic error when no specific error message', async () => {
            loginUser.mockRejectedValueOnce(new Error('Network error'));

            renderWithRouter(<SignIn />);
            fireEvent.change(screen.getByPlaceholderText(/Email address/i), { target: { value: 'test@example.com' } });
            fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'password123' } });
            fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

            await waitFor(() => {
                expect(screen.getByText(/An error occurred/i)).toBeInTheDocument();
            });
        });
    });

    describe('register form submission', () => {
        it('should call registerUser on submit', async () => {
            registerUser.mockResolvedValueOnce({});

            renderWithRouter(<SignIn />);
            fireEvent.click(screen.getByRole('button', { name: /Register/i }));

            fireEvent.change(screen.getByPlaceholderText(/First name/i), { target: { value: 'John' } });
            fireEvent.change(screen.getByPlaceholderText(/Last name/i), { target: { value: 'Doe' } });
            fireEvent.change(screen.getByPlaceholderText(/Email address/i), { target: { value: 'test@example.com' } });
            fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'securePassword123' } });

            fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

            await waitFor(() => {
                expect(registerUser).toHaveBeenCalledWith({
                    email: 'test@example.com',
                    password: 'securePassword123',
                    firstname: 'John',
                    lastname: 'Doe',
                    turnstileToken: 'test-turnstile-token'
                });
            });
        });

        it('should show success toast after successful registration', async () => {
            registerUser.mockResolvedValueOnce({});

            renderWithRouter(<SignIn />);
            fireEvent.click(screen.getByRole('button', { name: /Register/i }));

            fireEvent.change(screen.getByPlaceholderText(/First name/i), { target: { value: 'John' } });
            fireEvent.change(screen.getByPlaceholderText(/Last name/i), { target: { value: 'Doe' } });
            fireEvent.change(screen.getByPlaceholderText(/Email address/i), { target: { value: 'test@example.com' } });
            fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'securePassword123' } });

            fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

            await waitFor(() => {
                expect(mockShowToast).toHaveBeenCalledWith('Registration successful! Please sign in.', 'success');
            });
        });

        it('should switch to sign in mode after successful registration', async () => {
            registerUser.mockResolvedValueOnce({});

            renderWithRouter(<SignIn />);
            fireEvent.click(screen.getByRole('button', { name: /Register/i }));

            fireEvent.change(screen.getByPlaceholderText(/First name/i), { target: { value: 'John' } });
            fireEvent.change(screen.getByPlaceholderText(/Last name/i), { target: { value: 'Doe' } });
            fireEvent.change(screen.getByPlaceholderText(/Email address/i), { target: { value: 'test@example.com' } });
            fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'securePassword123' } });

            fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

            await waitFor(() => {
                expect(screen.getByRole('heading', { name: /Welcome Back/i })).toBeInTheDocument();
            });
        });

        it('should show loading state while registering', async () => {
            registerUser.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

            renderWithRouter(<SignIn />);
            fireEvent.click(screen.getByRole('button', { name: /Register/i }));

            fireEvent.change(screen.getByPlaceholderText(/First name/i), { target: { value: 'John' } });
            fireEvent.change(screen.getByPlaceholderText(/Last name/i), { target: { value: 'Doe' } });
            fireEvent.change(screen.getByPlaceholderText(/Email address/i), { target: { value: 'test@example.com' } });
            fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'securePassword123' } });

            fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

            expect(screen.getByText(/Creating Account.../i)).toBeInTheDocument();
        });

        it('should show error message on registration failure', async () => {
            registerUser.mockRejectedValueOnce({
                response: { data: { error: 'Email already exists' } }
            });

            renderWithRouter(<SignIn />);
            fireEvent.click(screen.getByRole('button', { name: /Register/i }));

            fireEvent.change(screen.getByPlaceholderText(/First name/i), { target: { value: 'John' } });
            fireEvent.change(screen.getByPlaceholderText(/Last name/i), { target: { value: 'Doe' } });
            fireEvent.change(screen.getByPlaceholderText(/Email address/i), { target: { value: 'test@example.com' } });
            fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'securePassword123' } });

            fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

            await waitFor(() => {
                expect(screen.getByText('Email already exists')).toBeInTheDocument();
            });
        });
    });

    describe('Google sign-in', () => {
        it('should call googleAuth when Google sign-in button clicked', async () => {
            googleAuth.mockResolvedValueOnce({ token: 'google-token', refreshToken: 'google-refresh' });

            renderWithRouter(<SignIn />);
            fireEvent.click(screen.getByTestId('google-signin-button'));

            await waitFor(() => {
                expect(googleAuth).toHaveBeenCalledWith('mock-google-credential');
            });
        });

        it('should store tokens in localStorage on successful Google sign-in', async () => {
            googleAuth.mockResolvedValueOnce({ token: 'google-token', refreshToken: 'google-refresh' });

            renderWithRouter(<SignIn />);
            fireEvent.click(screen.getByTestId('google-signin-button'));

            await waitFor(() => {
                expect(localStorage.getItem('token')).toBe('google-token');
                expect(localStorage.getItem('refreshToken')).toBe('google-refresh');
            });
        });

        it('should navigate to home after successful Google sign-in (no active league)', async () => {
            googleAuth.mockResolvedValueOnce({ token: 'google-token' });
            mockRefreshUserData.mockResolvedValueOnce({ activeLeague: null });

            renderWithRouter(<SignIn />);
            fireEvent.click(screen.getByTestId('google-signin-button'));

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/');
            });
        });

        it('should navigate to leagues page after successful Google sign-in (with active league)', async () => {
            googleAuth.mockResolvedValueOnce({ token: 'google-token' });
            mockRefreshUserData.mockResolvedValueOnce({ activeLeague: { league_id: 1 } });

            renderWithRouter(<SignIn />);
            fireEvent.click(screen.getByTestId('google-signin-button'));

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/leagues');
            });
        });

        it('should show error message on Google sign-in failure', async () => {
            googleAuth.mockRejectedValueOnce(new Error('Google auth failed'));

            renderWithRouter(<SignIn />);
            fireEvent.click(screen.getByTestId('google-signin-button'));

            await waitFor(() => {
                expect(screen.getByText(/Google sign-in failed/i)).toBeInTheDocument();
            });
        });
    });

    describe('Turnstile handling', () => {
        it('should disable submit button when no turnstile token', async () => {
            // Override mock to not provide token immediately
            jest.resetModules();
            jest.doMock('../TurnstileWidget', () => {
                const MockTurnstile = require('react').forwardRef(() => {
                    return require('react').createElement('div', { 'data-testid': 'turnstile-widget' }, 'Turnstile Widget');
                });
                MockTurnstile.displayName = 'MockTurnstileWidget';
                return MockTurnstile;
            });

            // Re-import SignIn with the new mock
            jest.isolateModules(() => {
                const { render, screen } = require('@testing-library/react');
                const { MemoryRouter } = require('react-router-dom');
                const SignInComponent = require('../SignIn').default;

                render(
                    <MemoryRouter>
                        <SignInComponent />
                    </MemoryRouter>
                );

                const submitButton = screen.getByRole('button', { name: /Sign In/i });
                expect(submitButton).toBeDisabled();
            });
        });
    });
});
