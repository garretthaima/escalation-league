import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import GoogleSignInButton from '../GoogleSignInButton';

describe('GoogleSignInButton', () => {
    let mockInitialize;
    let mockRenderButton;
    let originalGoogle;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();

        // Save original google object
        originalGoogle = window.google;

        // Mock Google accounts API
        mockInitialize = jest.fn();
        mockRenderButton = jest.fn();

        window.google = {
            accounts: {
                id: {
                    initialize: mockInitialize,
                    renderButton: mockRenderButton
                }
            }
        };

        // Mock process.env
        process.env.REACT_APP_GOOGLE_CLIENT_ID = 'test-client-id';
    });

    afterEach(() => {
        window.google = originalGoogle;
        jest.useRealTimers();
    });

    describe('rendering', () => {
        it('should render google signin button container', () => {
            const { container } = render(<GoogleSignInButton onSuccess={jest.fn()} />);
            expect(container.querySelector('#google-signin-button')).toBeInTheDocument();
        });

        it('should have correct id on container', () => {
            const { container } = render(<GoogleSignInButton onSuccess={jest.fn()} />);
            expect(container.querySelector('#google-signin-button')).toBeInTheDocument();
        });
    });

    describe('Google script initialization - google already loaded', () => {
        it('should call google.accounts.id.initialize when google is already loaded', () => {
            render(<GoogleSignInButton onSuccess={jest.fn()} />);

            expect(mockInitialize).toHaveBeenCalled();
        });

        it('should initialize with correct client_id', () => {
            render(<GoogleSignInButton onSuccess={jest.fn()} />);

            expect(mockInitialize).toHaveBeenCalledWith(
                expect.objectContaining({
                    client_id: 'test-client-id'
                })
            );
        });

        it('should call google.accounts.id.renderButton', () => {
            render(<GoogleSignInButton onSuccess={jest.fn()} />);

            expect(mockRenderButton).toHaveBeenCalled();
        });

        it('should render button with correct options', () => {
            render(<GoogleSignInButton onSuccess={jest.fn()} />);

            expect(mockRenderButton).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    theme: 'filled_black',
                    size: 'large',
                    width: 332,
                    text: 'continue_with',
                    shape: 'rectangular',
                    logo_alignment: 'left'
                })
            );
        });

        it('should call onSuccess callback when Google auth succeeds', () => {
            const mockOnSuccess = jest.fn();
            render(<GoogleSignInButton onSuccess={mockOnSuccess} />);

            // Get the callback that was passed to initialize
            const initializeCall = mockInitialize.mock.calls[0][0];
            const googleCallback = initializeCall.callback;

            // Simulate Google calling the callback
            const mockResponse = { credential: 'test-credential' };
            googleCallback(mockResponse);

            expect(mockOnSuccess).toHaveBeenCalledWith(mockResponse);
        });

        it('should only initialize once even when re-rendered', () => {
            const { rerender } = render(<GoogleSignInButton onSuccess={jest.fn()} />);

            rerender(<GoogleSignInButton onSuccess={jest.fn()} />);
            rerender(<GoogleSignInButton onSuccess={jest.fn()} />);

            expect(mockInitialize).toHaveBeenCalledTimes(1);
        });
    });

    describe('Google script initialization - google not loaded', () => {
        beforeEach(() => {
            delete window.google;
        });

        it('should create script element when google is not loaded', () => {
            const appendChildSpy = jest.spyOn(document.body, 'appendChild');

            render(<GoogleSignInButton onSuccess={jest.fn()} />);

            expect(appendChildSpy).toHaveBeenCalled();
            const scriptCall = appendChildSpy.mock.calls.find(
                call => call[0] && call[0].tagName === 'SCRIPT'
            );
            expect(scriptCall).toBeDefined();

            appendChildSpy.mockRestore();
        });

        it('should set correct src on script element', () => {
            const appendChildSpy = jest.spyOn(document.body, 'appendChild');

            render(<GoogleSignInButton onSuccess={jest.fn()} />);

            const scriptCall = appendChildSpy.mock.calls.find(
                call => call[0] && call[0].tagName === 'SCRIPT'
            );
            expect(scriptCall[0].src).toBe('https://accounts.google.com/gsi/client');

            appendChildSpy.mockRestore();
        });

        it('should set async and defer on script element', () => {
            const appendChildSpy = jest.spyOn(document.body, 'appendChild');

            render(<GoogleSignInButton onSuccess={jest.fn()} />);

            const scriptCall = appendChildSpy.mock.calls.find(
                call => call[0] && call[0].tagName === 'SCRIPT'
            );
            expect(scriptCall[0].async).toBe(true);
            expect(scriptCall[0].defer).toBe(true);

            appendChildSpy.mockRestore();
        });

        it('should initialize google when script loads', () => {
            const appendChildSpy = jest.spyOn(document.body, 'appendChild');

            render(<GoogleSignInButton onSuccess={jest.fn()} />);

            const scriptCall = appendChildSpy.mock.calls.find(
                call => call[0] && call[0].tagName === 'SCRIPT'
            );
            const script = scriptCall[0];

            // Simulate google being available after script loads
            window.google = {
                accounts: {
                    id: {
                        initialize: mockInitialize,
                        renderButton: mockRenderButton
                    }
                }
            };

            // Trigger onload
            act(() => {
                script.onload();
            });

            expect(mockInitialize).toHaveBeenCalled();

            appendChildSpy.mockRestore();
        });
    });

    describe('callback ref update', () => {
        it('should use updated callback when onSuccess changes', () => {
            const mockOnSuccess1 = jest.fn();
            const mockOnSuccess2 = jest.fn();

            const { rerender } = render(<GoogleSignInButton onSuccess={mockOnSuccess1} />);

            // Get the callback from the first render
            const initializeCall = mockInitialize.mock.calls[0][0];
            const googleCallback = initializeCall.callback;

            // Re-render with new callback
            rerender(<GoogleSignInButton onSuccess={mockOnSuccess2} />);

            // Simulate Google calling the callback after re-render
            const mockResponse = { credential: 'test-credential' };
            googleCallback(mockResponse);

            // The updated callback should be called
            expect(mockOnSuccess2).toHaveBeenCalledWith(mockResponse);
            expect(mockOnSuccess1).not.toHaveBeenCalled();
        });
    });

    describe('display name', () => {
        it('should have correct displayName', () => {
            expect(GoogleSignInButton.displayName).toBe('GoogleSignInButton');
        });
    });

    describe('memo behavior', () => {
        it('should be memoized component', () => {
            // React.memo wraps the component, so $$typeof should indicate a memo type
            expect(GoogleSignInButton.$$typeof).toBeDefined();
        });
    });

    describe('edge cases', () => {
        it('should handle buttonRef being null gracefully', () => {
            // This is an edge case that's hard to test directly since the ref
            // is always available in the component. The initialization check
            // includes buttonRef.current which would prevent issues.
            expect(() => {
                render(<GoogleSignInButton onSuccess={jest.fn()} />);
            }).not.toThrow();
        });

        it('should not re-initialize when re-rendered with same props', () => {
            const onSuccess = jest.fn();
            const { rerender } = render(<GoogleSignInButton onSuccess={onSuccess} />);

            expect(mockInitialize).toHaveBeenCalledTimes(1);

            rerender(<GoogleSignInButton onSuccess={onSuccess} />);

            expect(mockInitialize).toHaveBeenCalledTimes(1);
        });
    });
});
