import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ToastProvider, useToast } from './ToastContext';

// Test component that uses the toast context
const TestComponent = ({ toastType = 'success' }) => {
    const { showToast } = useToast();

    return (
        <div>
            <button onClick={() => showToast('Test message', toastType)}>
                Show Toast
            </button>
            <button onClick={() => showToast('Another message', 'error')}>
                Show Error
            </button>
        </div>
    );
};

describe('ToastContext', () => {
    describe('useToast hook', () => {
        it('should throw error when used outside ToastProvider', () => {
            // Suppress console.error for this test
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            const InvalidComponent = () => {
                useToast();
                return null;
            };

            expect(() => render(<InvalidComponent />)).toThrow(
                'useToast must be used within ToastProvider'
            );

            consoleSpy.mockRestore();
        });

        it('should provide showToast function', () => {
            let toastContext;
            const ContextReader = () => {
                toastContext = useToast();
                return null;
            };

            render(
                <ToastProvider>
                    <ContextReader />
                </ToastProvider>
            );

            expect(toastContext).toBeDefined();
            expect(typeof toastContext.showToast).toBe('function');
        });
    });

    describe('ToastProvider', () => {
        it('should render children', () => {
            render(
                <ToastProvider>
                    <div data-testid="child">Child content</div>
                </ToastProvider>
            );

            expect(screen.getByTestId('child')).toBeInTheDocument();
        });

        it('should not show any toasts initially', () => {
            render(
                <ToastProvider>
                    <TestComponent />
                </ToastProvider>
            );

            expect(screen.queryByText('Test message')).not.toBeInTheDocument();
        });
    });

    describe('showToast', () => {
        it('should display toast when showToast is called', () => {
            render(
                <ToastProvider>
                    <TestComponent />
                </ToastProvider>
            );

            fireEvent.click(screen.getByText('Show Toast'));

            expect(screen.getByText('Test message')).toBeInTheDocument();
        });

        it('should display toast with success type by default', () => {
            const { container } = render(
                <ToastProvider>
                    <TestComponent />
                </ToastProvider>
            );

            fireEvent.click(screen.getByText('Show Toast'));

            expect(container.querySelector('.toast-success')).toBeInTheDocument();
        });

        it('should display toast with error type', () => {
            const { container } = render(
                <ToastProvider>
                    <TestComponent toastType="error" />
                </ToastProvider>
            );

            fireEvent.click(screen.getByText('Show Error'));

            expect(container.querySelector('.toast-error')).toBeInTheDocument();
        });

        it('should display multiple toasts', () => {
            render(
                <ToastProvider>
                    <TestComponent />
                </ToastProvider>
            );

            fireEvent.click(screen.getByText('Show Toast'));
            fireEvent.click(screen.getByText('Show Error'));

            expect(screen.getByText('Test message')).toBeInTheDocument();
            expect(screen.getByText('Another message')).toBeInTheDocument();
        });
    });

    describe('toast dismissal', () => {
        it('should allow manual dismissal via close button', async () => {
            const { container } = render(
                <ToastProvider>
                    <TestComponent />
                </ToastProvider>
            );

            fireEvent.click(screen.getByText('Show Toast'));
            expect(screen.getByText('Test message')).toBeInTheDocument();

            // Click close button
            const closeButton = container.querySelector('.toast-close');
            fireEvent.click(closeButton);

            await waitFor(() => {
                expect(screen.queryByText('Test message')).not.toBeInTheDocument();
            });
        });
    });
});
