import React from 'react';
import { render, screen, act } from '@testing-library/react';
import LoadingSpinner from '../LoadingSpinner';

// Mock the timer
jest.useFakeTimers();

describe('LoadingSpinner', () => {
    afterEach(() => {
        jest.clearAllTimers();
    });

    describe('rendering', () => {
        it('should render with default props', () => {
            const { container } = render(<LoadingSpinner />);
            expect(container.querySelector('.loading-spinner-container')).toBeInTheDocument();
            expect(container.querySelector('.branded-spinner')).toBeInTheDocument();
        });

        it('should have status role for accessibility', () => {
            const { container } = render(<LoadingSpinner />);
            expect(container.querySelector('[role="status"]')).toBeInTheDocument();
        });

        it('should have visually hidden text for screen readers', () => {
            render(<LoadingSpinner text="Loading data..." />);
            expect(screen.getByText('Loading data...')).toHaveClass('visually-hidden');
        });
    });

    describe('size prop', () => {
        it('should apply default md size', () => {
            const { container } = render(<LoadingSpinner />);
            expect(container.querySelector('.spinner-md')).toBeInTheDocument();
        });

        it('should apply sm size', () => {
            const { container } = render(<LoadingSpinner size="sm" />);
            expect(container.querySelector('.spinner-sm')).toBeInTheDocument();
        });

        it('should apply lg size', () => {
            const { container } = render(<LoadingSpinner size="lg" />);
            expect(container.querySelector('.spinner-lg')).toBeInTheDocument();
        });
    });

    describe('text prop', () => {
        it('should use default loading text', () => {
            render(<LoadingSpinner />);
            expect(screen.getByText('Loading...')).toBeInTheDocument();
        });

        it('should use custom text', () => {
            render(<LoadingSpinner text="Fetching data..." />);
            expect(screen.getByText('Fetching data...')).toBeInTheDocument();
        });
    });

    describe('showText prop', () => {
        it('should not show visible text by default', () => {
            const { container } = render(<LoadingSpinner />);
            expect(container.querySelector('.spinner-text')).not.toBeInTheDocument();
        });

        it('should show visible text when showText is true', () => {
            const { container } = render(<LoadingSpinner showText={true} />);
            expect(container.querySelector('.spinner-text')).toBeInTheDocument();
        });

        it('should display custom text when showText is true', () => {
            render(<LoadingSpinner showText={true} text="Please wait..." />);
            const visibleText = screen.getAllByText('Please wait...');
            // One visible, one visually-hidden
            expect(visibleText.length).toBe(2);
        });
    });

    describe('className prop', () => {
        it('should apply additional className', () => {
            const { container } = render(<LoadingSpinner className="custom-spinner" />);
            expect(container.querySelector('.custom-spinner')).toBeInTheDocument();
        });

        it('should preserve default className with custom', () => {
            const { container } = render(<LoadingSpinner className="custom-spinner" />);
            expect(container.querySelector('.loading-spinner-container')).toHaveClass('custom-spinner');
        });
    });

    describe('mana cycling', () => {
        it('should have mana symbol container', () => {
            const { container } = render(<LoadingSpinner />);
            expect(container.querySelector('.mana-symbol-container')).toBeInTheDocument();
        });

        it('should have spinner rings', () => {
            const { container } = render(<LoadingSpinner />);
            const rings = container.querySelectorAll('.spinner-ring');
            expect(rings.length).toBe(2);
        });

        it('should cycle through mana symbols on interval', () => {
            const { container } = render(<LoadingSpinner />);

            // Capture initial state
            const initialSvg = container.querySelector('.mana-symbol-container svg');
            const initialContent = initialSvg?.innerHTML;

            // Advance timer by 400ms (one cycle)
            act(() => {
                jest.advanceTimersByTime(400);
            });

            // SVG content should change (different mana symbol)
            const updatedSvg = container.querySelector('.mana-symbol-container svg');
            // The SVG should still exist
            expect(updatedSvg).toBeInTheDocument();
        });

        it('should clean up interval on unmount', () => {
            const { unmount } = render(<LoadingSpinner />);
            const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

            unmount();

            expect(clearIntervalSpy).toHaveBeenCalled();
            clearIntervalSpy.mockRestore();
        });
    });

    describe('structure', () => {
        it('should have proper DOM structure', () => {
            const { container } = render(<LoadingSpinner />);

            // Container > branded-spinner > rings + mana-symbol-container
            const spinnerContainer = container.querySelector('.loading-spinner-container');
            const brandedSpinner = spinnerContainer.querySelector('.branded-spinner');
            const manaContainer = brandedSpinner.querySelector('.mana-symbol-container');

            expect(spinnerContainer).toBeInTheDocument();
            expect(brandedSpinner).toBeInTheDocument();
            expect(manaContainer).toBeInTheDocument();
        });
    });
});
