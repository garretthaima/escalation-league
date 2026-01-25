// Mock the Turnstile component from @marsidev/react-turnstile - must be before imports
jest.mock('@marsidev/react-turnstile', () => ({
    Turnstile: require('react').forwardRef(({ siteKey, onSuccess, onError, onExpire, options }, ref) => {
        const React = require('react');

        React.useImperativeHandle(ref, () => ({
            reset: jest.fn()
        }));

        return React.createElement('div', {
            'data-testid': 'turnstile-widget',
            'data-site-key': siteKey,
            'data-theme': options?.theme,
            'data-size': options?.size,
            onClick: () => {
                // Allow tests to trigger callbacks via global
                if (global.__turnstileCallback === 'success') onSuccess?.('test-token');
                if (global.__turnstileCallback === 'error') onError?.();
                if (global.__turnstileCallback === 'expire') onExpire?.();
            }
        }, 'Turnstile Mock');
    })
}));

import React, { createRef } from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import TurnstileWidget from '../TurnstileWidget';

describe('TurnstileWidget', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        global.__turnstileCallback = null;
    });

    afterEach(() => {
        process.env = originalEnv;
        jest.useRealTimers();
    });

    describe('with site key configured', () => {
        beforeEach(() => {
            process.env = {
                ...originalEnv,
                REACT_APP_TURNSTILE_SITE_KEY: 'test-site-key'
            };
        });

        it('should render Turnstile widget container', () => {
            render(<TurnstileWidget onVerify={jest.fn()} />);
            expect(screen.getByTestId('turnstile-widget')).toBeInTheDocument();
        });

        it('should pass site key to Turnstile', () => {
            render(<TurnstileWidget onVerify={jest.fn()} />);
            expect(screen.getByTestId('turnstile-widget')).toHaveAttribute('data-site-key', 'test-site-key');
        });

        it('should pass theme option to Turnstile', () => {
            render(<TurnstileWidget onVerify={jest.fn()} />);
            expect(screen.getByTestId('turnstile-widget')).toHaveAttribute('data-theme', 'auto');
        });

        it('should pass size option to Turnstile', () => {
            render(<TurnstileWidget onVerify={jest.fn()} />);
            expect(screen.getByTestId('turnstile-widget')).toHaveAttribute('data-size', 'invisible');
        });

        it('should render inside turnstile-container div', () => {
            const { container } = render(<TurnstileWidget onVerify={jest.fn()} />);
            expect(container.querySelector('.turnstile-container')).toBeInTheDocument();
        });

        it('should call onVerify when verification succeeds', () => {
            const onVerify = jest.fn();
            render(<TurnstileWidget onVerify={onVerify} />);

            global.__turnstileCallback = 'success';
            screen.getByTestId('turnstile-widget').click();

            expect(onVerify).toHaveBeenCalledWith('test-token');
        });

        it('should call onError when verification fails', () => {
            const onError = jest.fn();
            render(<TurnstileWidget onVerify={jest.fn()} onError={onError} />);

            global.__turnstileCallback = 'error';
            screen.getByTestId('turnstile-widget').click();

            expect(onError).toHaveBeenCalled();
        });

        it('should call onExpire when token expires', () => {
            const onExpire = jest.fn();
            render(<TurnstileWidget onVerify={jest.fn()} onExpire={onExpire} />);

            global.__turnstileCallback = 'expire';
            screen.getByTestId('turnstile-widget').click();

            expect(onExpire).toHaveBeenCalled();
        });

        it('should expose reset method via ref', () => {
            const ref = createRef();
            render(<TurnstileWidget ref={ref} onVerify={jest.fn()} />);

            expect(ref.current).toHaveProperty('reset');
            expect(typeof ref.current.reset).toBe('function');
        });

        it('should call turnstileRef.reset when reset is called', () => {
            const ref = createRef();
            render(<TurnstileWidget ref={ref} onVerify={jest.fn()} />);

            // Calling reset should not throw
            expect(() => ref.current.reset()).not.toThrow();
        });
    });

    describe('without site key (dev mode)', () => {
        beforeEach(() => {
            process.env = {
                ...originalEnv,
                REACT_APP_TURNSTILE_SITE_KEY: undefined
            };
        });

        it('should return null when no site key', () => {
            const { container } = render(<TurnstileWidget onVerify={jest.fn()} />);
            expect(container.querySelector('.turnstile-container')).not.toBeInTheDocument();
        });

        it('should not render Turnstile widget when no site key', () => {
            render(<TurnstileWidget onVerify={jest.fn()} />);
            expect(screen.queryByTestId('turnstile-widget')).not.toBeInTheDocument();
        });

        it('should call onVerify with dev bypass token after delay', async () => {
            const onVerify = jest.fn();
            render(<TurnstileWidget onVerify={onVerify} />);

            // Fast-forward timers
            act(() => {
                jest.advanceTimersByTime(100);
            });

            expect(onVerify).toHaveBeenCalledWith('dev-bypass-token');
        });

        it('should expose reset method that increments devResetKey', () => {
            const ref = createRef();
            const onVerify = jest.fn();
            render(<TurnstileWidget ref={ref} onVerify={onVerify} />);

            // Initial dev bypass call
            act(() => {
                jest.advanceTimersByTime(100);
            });

            expect(onVerify).toHaveBeenCalledTimes(1);

            // Reset should trigger another dev bypass
            act(() => {
                ref.current.reset();
            });

            act(() => {
                jest.advanceTimersByTime(100);
            });

            expect(onVerify).toHaveBeenCalledTimes(2);
        });
    });

    describe('with empty site key', () => {
        beforeEach(() => {
            process.env = {
                ...originalEnv,
                REACT_APP_TURNSTILE_SITE_KEY: ''
            };
        });

        it('should return null when site key is empty string', () => {
            const { container } = render(<TurnstileWidget onVerify={jest.fn()} />);
            expect(container.querySelector('.turnstile-container')).not.toBeInTheDocument();
        });

        it('should call onVerify with dev bypass token', async () => {
            const onVerify = jest.fn();
            render(<TurnstileWidget onVerify={onVerify} />);

            act(() => {
                jest.advanceTimersByTime(100);
            });

            expect(onVerify).toHaveBeenCalledWith('dev-bypass-token');
        });
    });

    describe('displayName', () => {
        it('should have correct displayName', () => {
            expect(TurnstileWidget.displayName).toBe('TurnstileWidget');
        });
    });

    describe('cleanup', () => {
        beforeEach(() => {
            process.env = {
                ...originalEnv,
                REACT_APP_TURNSTILE_SITE_KEY: undefined
            };
        });

        it('should clear timeout on unmount', () => {
            const onVerify = jest.fn();
            const { unmount } = render(<TurnstileWidget onVerify={onVerify} />);

            // Unmount before timer fires
            unmount();

            // Advance timers
            act(() => {
                jest.advanceTimersByTime(100);
            });

            // onVerify should not be called since component unmounted
            expect(onVerify).not.toHaveBeenCalled();
        });
    });

    describe('ref forwarding', () => {
        beforeEach(() => {
            process.env = {
                ...originalEnv,
                REACT_APP_TURNSTILE_SITE_KEY: 'test-site-key'
            };
        });

        it('should work without ref', () => {
            expect(() => {
                render(<TurnstileWidget onVerify={jest.fn()} />);
            }).not.toThrow();
        });

        it('should handle null ref', () => {
            expect(() => {
                render(<TurnstileWidget ref={null} onVerify={jest.fn()} />);
            }).not.toThrow();
        });
    });

    describe('callback handling', () => {
        beforeEach(() => {
            process.env = {
                ...originalEnv,
                REACT_APP_TURNSTILE_SITE_KEY: 'test-site-key'
            };
        });

        it('should handle missing onError callback', () => {
            render(<TurnstileWidget onVerify={jest.fn()} />);

            global.__turnstileCallback = 'error';
            expect(() => {
                screen.getByTestId('turnstile-widget').click();
            }).not.toThrow();
        });

        it('should handle missing onExpire callback', () => {
            render(<TurnstileWidget onVerify={jest.fn()} />);

            global.__turnstileCallback = 'expire';
            expect(() => {
                screen.getByTestId('turnstile-widget').click();
            }).not.toThrow();
        });
    });
});
