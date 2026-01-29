import {
    registerUser,
    loginUser,
    googleAuth,
    refreshAccessToken,
    logoutUser,
    logoutAllDevices,
    checkAuthorization,
    verifyEmail,
    resendVerificationEmail,
    requestPasswordReset,
    resetPassword,
} from '../authApi';
import axiosInstance from '../axiosConfig';

// Mock axiosInstance
jest.mock('../axiosConfig', () => ({
    __esModule: true,
    default: {
        post: jest.fn(),
    },
}));

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: jest.fn((key) => store[key] || null),
        setItem: jest.fn((key, value) => {
            store[key] = value;
        }),
        removeItem: jest.fn((key) => {
            delete store[key];
        }),
        clear: jest.fn(() => {
            store = {};
        }),
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

// Mock console.warn to avoid noisy test output
const originalWarn = console.warn;

describe('authApi', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorageMock.clear();
        console.warn = jest.fn();
    });

    afterAll(() => {
        console.warn = originalWarn;
    });

    describe('registerUser', () => {
        it('should make POST request to /auth/register with userData', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'Password123!',
                displayName: 'Test User',
            };
            const mockResponse = { data: { message: 'Registration successful' } };
            axiosInstance.post.mockResolvedValueOnce(mockResponse);

            const result = await registerUser(userData);

            expect(axiosInstance.post).toHaveBeenCalledWith('/auth/register', userData);
            expect(axiosInstance.post).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResponse.data);
        });

        it('should throw error when registration fails', async () => {
            const userData = { email: 'test@example.com', password: 'short' };
            const error = new Error('Validation failed');
            error.response = { status: 400, data: { message: 'Validation failed' } };
            axiosInstance.post.mockRejectedValueOnce(error);

            await expect(registerUser(userData)).rejects.toThrow('Validation failed');
        });
    });

    describe('loginUser', () => {
        it('should make POST request and store both tokens in localStorage', async () => {
            const credentials = { email: 'test@example.com', password: 'Password123!' };
            const mockResponse = {
                data: {
                    token: 'access-token-123',
                    refreshToken: 'refresh-token-456',
                    user: { id: '1', email: 'test@example.com' },
                },
            };
            axiosInstance.post.mockResolvedValueOnce(mockResponse);

            const result = await loginUser(credentials);

            expect(axiosInstance.post).toHaveBeenCalledWith('/auth/login', credentials);
            expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'access-token-123');
            expect(localStorageMock.setItem).toHaveBeenCalledWith('refreshToken', 'refresh-token-456');
            expect(result).toEqual(mockResponse.data);
        });

        it('should store only access token when refreshToken is not provided', async () => {
            const credentials = { email: 'test@example.com', password: 'Password123!' };
            const mockResponse = {
                data: {
                    token: 'access-token-123',
                    user: { id: '1', email: 'test@example.com' },
                },
            };
            axiosInstance.post.mockResolvedValueOnce(mockResponse);

            const result = await loginUser(credentials);

            expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'access-token-123');
            expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResponse.data);
        });

        it('should throw error when login fails', async () => {
            const credentials = { email: 'test@example.com', password: 'wrong' };
            const error = new Error('Invalid credentials');
            axiosInstance.post.mockRejectedValueOnce(error);

            await expect(loginUser(credentials)).rejects.toThrow('Invalid credentials');
            expect(localStorageMock.setItem).not.toHaveBeenCalled();
        });
    });

    describe('googleAuth', () => {
        it('should make POST request with Google token and store tokens', async () => {
            const googleToken = 'google-oauth-token-123';
            const mockResponse = {
                data: {
                    token: 'jwt-token-456',
                    refreshToken: 'refresh-token-789',
                    user: { id: '1', email: 'test@gmail.com' },
                },
            };
            axiosInstance.post.mockResolvedValueOnce(mockResponse);

            const result = await googleAuth(googleToken);

            expect(axiosInstance.post).toHaveBeenCalledWith('/auth/google-auth', { token: googleToken });
            expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'jwt-token-456');
            expect(localStorageMock.setItem).toHaveBeenCalledWith('refreshToken', 'refresh-token-789');
            expect(result).toEqual(mockResponse.data);
        });

        it('should store only access token when refreshToken is not provided', async () => {
            const googleToken = 'google-oauth-token-123';
            const mockResponse = {
                data: {
                    token: 'jwt-token-456',
                    user: { id: '1', email: 'test@gmail.com' },
                },
            };
            axiosInstance.post.mockResolvedValueOnce(mockResponse);

            const result = await googleAuth(googleToken);

            expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'jwt-token-456');
            expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResponse.data);
        });

        it('should throw error when Google auth fails', async () => {
            const googleToken = 'invalid-token';
            const error = new Error('Google authentication failed');
            axiosInstance.post.mockRejectedValueOnce(error);

            await expect(googleAuth(googleToken)).rejects.toThrow('Google authentication failed');
            expect(localStorageMock.setItem).not.toHaveBeenCalled();
        });
    });

    describe('refreshAccessToken', () => {
        it('should throw error when no refresh token in localStorage', async () => {
            localStorageMock.getItem.mockReturnValueOnce(null);

            await expect(refreshAccessToken()).rejects.toThrow('No refresh token available');
            expect(axiosInstance.post).not.toHaveBeenCalled();
        });

        it('should make POST request with refresh token and update both tokens', async () => {
            localStorageMock.getItem.mockReturnValueOnce('old-refresh-token');
            const mockResponse = {
                data: {
                    token: 'new-access-token',
                    refreshToken: 'new-refresh-token',
                },
            };
            axiosInstance.post.mockResolvedValueOnce(mockResponse);

            const result = await refreshAccessToken();

            expect(localStorageMock.getItem).toHaveBeenCalledWith('refreshToken');
            expect(axiosInstance.post).toHaveBeenCalledWith('/auth/refresh', { refreshToken: 'old-refresh-token' });
            expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'new-access-token');
            expect(localStorageMock.setItem).toHaveBeenCalledWith('refreshToken', 'new-refresh-token');
            expect(result).toEqual(mockResponse.data);
        });

        it('should update only access token when new refreshToken is not provided', async () => {
            localStorageMock.getItem.mockReturnValueOnce('existing-refresh-token');
            const mockResponse = {
                data: {
                    token: 'new-access-token',
                },
            };
            axiosInstance.post.mockResolvedValueOnce(mockResponse);

            const result = await refreshAccessToken();

            expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'new-access-token');
            expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResponse.data);
        });

        it('should throw error when refresh request fails', async () => {
            localStorageMock.getItem.mockReturnValueOnce('expired-refresh-token');
            const error = new Error('Token expired');
            axiosInstance.post.mockRejectedValueOnce(error);

            await expect(refreshAccessToken()).rejects.toThrow('Token expired');
        });
    });

    describe('logoutUser', () => {
        it('should call logout API and clear localStorage when refresh token exists', async () => {
            localStorageMock.getItem.mockReturnValueOnce('refresh-token-123');
            axiosInstance.post.mockResolvedValueOnce({ data: { message: 'Logged out' } });

            await logoutUser();

            expect(localStorageMock.getItem).toHaveBeenCalledWith('refreshToken');
            expect(axiosInstance.post).toHaveBeenCalledWith('/auth/logout', { refreshToken: 'refresh-token-123' });
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken');
        });

        it('should clear localStorage even when no refresh token exists', async () => {
            localStorageMock.getItem.mockReturnValueOnce(null);

            await logoutUser();

            expect(axiosInstance.post).not.toHaveBeenCalled();
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken');
        });

        it('should clear localStorage even when API call fails', async () => {
            localStorageMock.getItem.mockReturnValueOnce('refresh-token-123');
            const error = new Error('Network error');
            axiosInstance.post.mockRejectedValueOnce(error);

            await logoutUser();

            expect(console.warn).toHaveBeenCalledWith('Logout API call failed:', error);
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken');
        });
    });

    describe('logoutAllDevices', () => {
        it('should call logout-all API and clear localStorage', async () => {
            axiosInstance.post.mockResolvedValueOnce({ data: { message: 'All devices logged out' } });

            await logoutAllDevices();

            expect(axiosInstance.post).toHaveBeenCalledWith('/auth/logout-all');
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken');
        });

        it('should throw error and not clear localStorage when API call fails', async () => {
            const error = new Error('Unauthorized');
            axiosInstance.post.mockRejectedValueOnce(error);

            await expect(logoutAllDevices()).rejects.toThrow('Unauthorized');
            expect(localStorageMock.removeItem).not.toHaveBeenCalled();
        });
    });

    describe('checkAuthorization', () => {
        it('should make POST request with required permissions and return authorized status', async () => {
            const requiredPermissions = ['admin:read', 'admin:write'];
            const mockResponse = { data: { authorized: true } };
            axiosInstance.post.mockResolvedValueOnce(mockResponse);

            const result = await checkAuthorization(requiredPermissions);

            expect(axiosInstance.post).toHaveBeenCalledWith('/auth/authorize', { requiredPermissions });
            expect(result).toBe(true);
        });

        it('should return false when not authorized', async () => {
            const requiredPermissions = ['admin:delete'];
            const mockResponse = { data: { authorized: false } };
            axiosInstance.post.mockResolvedValueOnce(mockResponse);

            const result = await checkAuthorization(requiredPermissions);

            expect(result).toBe(false);
        });

        it('should throw error when authorization check fails', async () => {
            const requiredPermissions = ['admin:read'];
            const error = new Error('Unauthorized');
            axiosInstance.post.mockRejectedValueOnce(error);

            await expect(checkAuthorization(requiredPermissions)).rejects.toThrow('Unauthorized');
        });
    });

    describe('verifyEmail', () => {
        it('should make POST request with verification token', async () => {
            const verificationToken = 'email-verification-token-123';
            const mockResponse = { data: { message: 'Email verified successfully' } };
            axiosInstance.post.mockResolvedValueOnce(mockResponse);

            const result = await verifyEmail(verificationToken);

            expect(axiosInstance.post).toHaveBeenCalledWith('/auth/verify-email', { token: verificationToken });
            expect(result).toEqual(mockResponse.data);
        });

        it('should throw error when verification fails', async () => {
            const verificationToken = 'expired-token';
            const error = new Error('Token expired');
            axiosInstance.post.mockRejectedValueOnce(error);

            await expect(verifyEmail(verificationToken)).rejects.toThrow('Token expired');
        });
    });

    describe('resendVerificationEmail', () => {
        it('should make POST request with email address', async () => {
            const email = 'test@example.com';
            const mockResponse = { data: { message: 'Verification email sent' } };
            axiosInstance.post.mockResolvedValueOnce(mockResponse);

            const result = await resendVerificationEmail(email);

            expect(axiosInstance.post).toHaveBeenCalledWith('/auth/resend-verification', { email });
            expect(result).toEqual(mockResponse.data);
        });

        it('should throw error when resend fails', async () => {
            const email = 'nonexistent@example.com';
            const error = new Error('User not found');
            axiosInstance.post.mockRejectedValueOnce(error);

            await expect(resendVerificationEmail(email)).rejects.toThrow('User not found');
        });
    });

    describe('requestPasswordReset', () => {
        it('should make POST request with email and turnstile token', async () => {
            const email = 'test@example.com';
            const turnstileToken = 'turnstile-verification-token';
            const mockResponse = { data: { message: 'Password reset email sent' } };
            axiosInstance.post.mockResolvedValueOnce(mockResponse);

            const result = await requestPasswordReset(email, turnstileToken);

            expect(axiosInstance.post).toHaveBeenCalledWith('/auth/forgot-password', { email, turnstileToken });
            expect(result).toEqual(mockResponse.data);
        });

        it('should throw error when password reset request fails', async () => {
            const email = 'test@example.com';
            const turnstileToken = 'invalid-token';
            const error = new Error('Invalid captcha');
            axiosInstance.post.mockRejectedValueOnce(error);

            await expect(requestPasswordReset(email, turnstileToken)).rejects.toThrow('Invalid captcha');
        });
    });

    describe('resetPassword', () => {
        it('should make POST request with reset token and new password', async () => {
            const resetToken = 'password-reset-token-123';
            const newPassword = 'NewPassword123!';
            const mockResponse = { data: { message: 'Password reset successful' } };
            axiosInstance.post.mockResolvedValueOnce(mockResponse);

            const result = await resetPassword(resetToken, newPassword);

            expect(axiosInstance.post).toHaveBeenCalledWith('/auth/reset-password', { token: resetToken, newPassword });
            expect(result).toEqual(mockResponse.data);
        });

        it('should throw error when password reset fails', async () => {
            const resetToken = 'expired-token';
            const newPassword = 'NewPassword123!';
            const error = new Error('Token expired');
            axiosInstance.post.mockRejectedValueOnce(error);

            await expect(resetPassword(resetToken, newPassword)).rejects.toThrow('Token expired');
        });
    });
});
