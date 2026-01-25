import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Toast from '../Toast';

jest.useFakeTimers();

describe('Toast', () => {
    const defaultProps = {
        show: true,
        message: 'Test message',
        onClose: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
    });

    describe('rendering', () => {
        it('should not render when show is false', () => {
            const { container } = render(<Toast {...defaultProps} show={false} />);
            expect(container.firstChild).toBeNull();
        });

        it('should render when show is true', () => {
            render(<Toast {...defaultProps} />);
            expect(screen.getByText('Test message')).toBeInTheDocument();
        });

        it('should render message', () => {
            render(<Toast {...defaultProps} message="Custom message" />);
            expect(screen.getByText('Custom message')).toBeInTheDocument();
        });

        it('should render close button', () => {
            const { container } = render(<Toast {...defaultProps} />);
            expect(container.querySelector('.toast-close')).toBeInTheDocument();
        });
    });

    describe('type styling', () => {
        it('should apply success class by default', () => {
            const { container } = render(<Toast {...defaultProps} />);
            expect(container.querySelector('.toast-success')).toBeInTheDocument();
        });

        it('should apply success class for success type', () => {
            const { container } = render(<Toast {...defaultProps} type="success" />);
            expect(container.querySelector('.toast-success')).toBeInTheDocument();
        });

        it('should apply error class for error type', () => {
            const { container } = render(<Toast {...defaultProps} type="error" />);
            expect(container.querySelector('.toast-error')).toBeInTheDocument();
        });

        it('should apply warning class for warning type', () => {
            const { container } = render(<Toast {...defaultProps} type="warning" />);
            expect(container.querySelector('.toast-warning')).toBeInTheDocument();
        });

        it('should apply info class for info type', () => {
            const { container } = render(<Toast {...defaultProps} type="info" />);
            expect(container.querySelector('.toast-info')).toBeInTheDocument();
        });

        it('should default to success class for unknown type', () => {
            const { container } = render(<Toast {...defaultProps} type="unknown" />);
            expect(container.querySelector('.toast-success')).toBeInTheDocument();
        });
    });

    describe('icons', () => {
        it('should show checkmark icon for success type', () => {
            const { container } = render(<Toast {...defaultProps} type="success" />);
            expect(container.querySelector('.toast-icon')).toHaveTextContent('✓');
        });

        it('should show X icon for error type', () => {
            const { container } = render(<Toast {...defaultProps} type="error" />);
            expect(container.querySelector('.toast-icon')).toHaveTextContent('✕');
        });

        it('should show warning icon for warning type', () => {
            const { container } = render(<Toast {...defaultProps} type="warning" />);
            expect(container.querySelector('.toast-icon')).toHaveTextContent('⚠');
        });

        it('should show info icon for info type', () => {
            const { container } = render(<Toast {...defaultProps} type="info" />);
            expect(container.querySelector('.toast-icon')).toHaveTextContent('ℹ');
        });

        it('should default to checkmark icon', () => {
            const { container } = render(<Toast {...defaultProps} type="unknown" />);
            expect(container.querySelector('.toast-icon')).toHaveTextContent('✓');
        });
    });

    describe('close functionality', () => {
        it('should call onClose when close button is clicked', () => {
            const { container } = render(<Toast {...defaultProps} />);
            const closeButton = container.querySelector('.toast-close');
            fireEvent.click(closeButton);
            expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('auto-dismiss', () => {
        it('should call onClose after 4 seconds', () => {
            render(<Toast {...defaultProps} />);

            expect(defaultProps.onClose).not.toHaveBeenCalled();

            act(() => {
                jest.advanceTimersByTime(4000);
            });

            expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
        });

        it('should not auto-dismiss if show becomes false', () => {
            const { rerender } = render(<Toast {...defaultProps} />);

            act(() => {
                jest.advanceTimersByTime(2000);
            });

            // Hide the toast
            rerender(<Toast {...defaultProps} show={false} />);

            act(() => {
                jest.advanceTimersByTime(3000);
            });

            // onClose should not have been called by timer
            expect(defaultProps.onClose).not.toHaveBeenCalled();
        });

        it('should clear timer on unmount', () => {
            const { unmount } = render(<Toast {...defaultProps} />);
            const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

            unmount();

            expect(clearTimeoutSpy).toHaveBeenCalled();
            clearTimeoutSpy.mockRestore();
        });
    });

    describe('CSS classes', () => {
        it('should have custom-toast class', () => {
            const { container } = render(<Toast {...defaultProps} />);
            expect(container.querySelector('.custom-toast')).toBeInTheDocument();
        });

        it('should have toast-show class when visible', () => {
            const { container } = render(<Toast {...defaultProps} />);
            expect(container.querySelector('.toast-show')).toBeInTheDocument();
        });
    });

    describe('structure', () => {
        it('should have proper structure', () => {
            const { container } = render(<Toast {...defaultProps} />);
            expect(container.querySelector('.toast-icon')).toBeInTheDocument();
            expect(container.querySelector('.toast-message')).toBeInTheDocument();
            expect(container.querySelector('.toast-close')).toBeInTheDocument();
        });
    });
});
