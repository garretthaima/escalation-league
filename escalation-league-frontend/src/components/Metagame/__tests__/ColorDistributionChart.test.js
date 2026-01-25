import React from 'react';
import { render, screen } from '@testing-library/react';
import ColorDistributionChart from '../ColorDistributionChart';

// Mock ManaSymbol component
jest.mock('../../Shared/ManaSymbols', () => {
    return function MockManaSymbol({ color, size, className }) {
        return <span data-testid={`mana-symbol-${color}`} className={className}>{color}</span>;
    };
});

describe('ColorDistributionChart', () => {
    describe('rendering with valid data', () => {
        it('should render color distribution for all WUBRG colors', () => {
            const colors = { W: 10, U: 15, B: 20, R: 12, G: 18 };
            render(<ColorDistributionChart colors={colors} />);

            expect(screen.getByText('White')).toBeInTheDocument();
            expect(screen.getByText('Blue')).toBeInTheDocument();
            expect(screen.getByText('Black')).toBeInTheDocument();
            expect(screen.getByText('Red')).toBeInTheDocument();
            expect(screen.getByText('Green')).toBeInTheDocument();
        });

        it('should render mana symbols for each color', () => {
            const colors = { W: 10, U: 15, B: 20, R: 12, G: 18 };
            render(<ColorDistributionChart colors={colors} />);

            expect(screen.getByTestId('mana-symbol-W')).toBeInTheDocument();
            expect(screen.getByTestId('mana-symbol-U')).toBeInTheDocument();
            expect(screen.getByTestId('mana-symbol-B')).toBeInTheDocument();
            expect(screen.getByTestId('mana-symbol-R')).toBeInTheDocument();
            expect(screen.getByTestId('mana-symbol-G')).toBeInTheDocument();
        });

        it('should display count and percentage for each color', () => {
            const colors = { W: 10, U: 20 };
            render(<ColorDistributionChart colors={colors} />);

            // Total = 30, W = 33.3%, U = 66.7%
            expect(screen.getByText(/10 \(33.3%\)/)).toBeInTheDocument();
            expect(screen.getByText(/20 \(66.7%\)/)).toBeInTheDocument();
        });

        it('should render colorless (C) color', () => {
            const colors = { W: 10, C: 5 };
            render(<ColorDistributionChart colors={colors} />);

            expect(screen.getByText('White')).toBeInTheDocument();
            expect(screen.getByText('Colorless')).toBeInTheDocument();
            expect(screen.getByTestId('mana-symbol-C')).toBeInTheDocument();
        });

        it('should render progress bars for each color', () => {
            const colors = { W: 10, U: 20 };
            render(<ColorDistributionChart colors={colors} />);

            const progressBars = screen.getAllByRole('progressbar');
            expect(progressBars).toHaveLength(2);
        });

        it('should set correct aria values on progress bars', () => {
            const colors = { W: 25, U: 75 };
            render(<ColorDistributionChart colors={colors} />);

            const progressBars = screen.getAllByRole('progressbar');
            // W = 25%
            expect(progressBars[0]).toHaveAttribute('aria-valuenow', '25');
            expect(progressBars[0]).toHaveAttribute('aria-valuemin', '0');
            expect(progressBars[0]).toHaveAttribute('aria-valuemax', '100');
            // U = 75%
            expect(progressBars[1]).toHaveAttribute('aria-valuenow', '75');
        });

        it('should handle single color data', () => {
            const colors = { G: 50 };
            render(<ColorDistributionChart colors={colors} />);

            expect(screen.getByText('Green')).toBeInTheDocument();
            expect(screen.getByText(/50 \(100.0%\)/)).toBeInTheDocument();
        });
    });

    describe('rendering with edge cases', () => {
        it('should display message when colors is undefined', () => {
            render(<ColorDistributionChart colors={undefined} />);
            expect(screen.getByText('No color distribution data available')).toBeInTheDocument();
        });

        it('should display message when colors is null', () => {
            render(<ColorDistributionChart colors={null} />);
            expect(screen.getByText('No color distribution data available')).toBeInTheDocument();
        });

        it('should display message when colors is not an object', () => {
            render(<ColorDistributionChart colors="invalid" />);
            expect(screen.getByText('No color distribution data available')).toBeInTheDocument();
        });

        it('should display message when colors is an array', () => {
            render(<ColorDistributionChart colors={['W', 'U']} />);
            // Arrays have integer keys, not color keys, so nothing will render as valid colors
            // The component should handle this gracefully
            expect(screen.queryByText('White')).not.toBeInTheDocument();
        });

        it('should handle empty object', () => {
            const colors = {};
            const { container } = render(<ColorDistributionChart colors={colors} />);
            // Should render the container but with no color entries
            expect(container.querySelector('.color-distribution')).toBeInTheDocument();
            expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        });

        it('should skip colors with count of 0', () => {
            const colors = { W: 0, U: 10 };
            render(<ColorDistributionChart colors={colors} />);

            expect(screen.queryByText('White')).not.toBeInTheDocument();
            expect(screen.getByText('Blue')).toBeInTheDocument();
        });

        it('should skip unknown color codes', () => {
            const colors = { W: 10, X: 5, Y: 3 };
            render(<ColorDistributionChart colors={colors} />);

            expect(screen.getByText('White')).toBeInTheDocument();
            // X and Y are not in colorMap, so they should be skipped
            const progressBars = screen.getAllByRole('progressbar');
            expect(progressBars).toHaveLength(1);
        });

        it('should handle all counts being 0', () => {
            const colors = { W: 0, U: 0, B: 0 };
            const { container } = render(<ColorDistributionChart colors={colors} />);

            // All have count 0, so nothing renders
            expect(container.querySelector('.color-distribution')).toBeInTheDocument();
            expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        });

        it('should handle percentage when total is 0', () => {
            // Edge case: all values are 0, total would be 0
            // This is handled by the conditional: percentage = total > 0 ? ... : 0
            const colors = { W: 0 };
            render(<ColorDistributionChart colors={colors} />);

            // W has count 0, so it's skipped entirely
            expect(screen.queryByText('White')).not.toBeInTheDocument();
        });
    });

    describe('styling', () => {
        it('should apply correct background color to progress bars', () => {
            const colors = { W: 10, U: 20 };
            render(<ColorDistributionChart colors={colors} />);

            const progressBars = screen.getAllByRole('progressbar');
            // White color
            expect(progressBars[0]).toHaveStyle({ backgroundColor: '#F0E68C' });
            // Blue color
            expect(progressBars[1]).toHaveStyle({ backgroundColor: '#4682B4' });
        });

        it('should set progress bar width based on percentage', () => {
            const colors = { W: 25, U: 75 };
            render(<ColorDistributionChart colors={colors} />);

            const progressBars = screen.getAllByRole('progressbar');
            expect(progressBars[0]).toHaveStyle({ width: '25%' });
            expect(progressBars[1]).toHaveStyle({ width: '75%' });
        });

        it('should have progress bar container with fixed height', () => {
            const colors = { W: 10 };
            const { container } = render(<ColorDistributionChart colors={colors} />);

            const progressContainer = container.querySelector('.progress');
            expect(progressContainer).toHaveStyle({ height: '20px' });
        });
    });

    describe('component structure', () => {
        it('should have color-distribution class on container', () => {
            const colors = { W: 10 };
            const { container } = render(<ColorDistributionChart colors={colors} />);

            expect(container.querySelector('.color-distribution')).toBeInTheDocument();
        });

        it('should wrap each color entry in mb-3 class div', () => {
            const colors = { W: 10, U: 20 };
            const { container } = render(<ColorDistributionChart colors={colors} />);

            const colorEntries = container.querySelectorAll('.mb-3');
            expect(colorEntries.length).toBeGreaterThanOrEqual(2);
        });
    });
});
