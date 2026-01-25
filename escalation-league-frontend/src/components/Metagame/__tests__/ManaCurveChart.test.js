import React from 'react';
import { render, screen } from '@testing-library/react';
import ManaCurveChart from '../ManaCurveChart';

describe('ManaCurveChart', () => {
    describe('rendering with valid data', () => {
        it('should render mana curve bars for each CMC', () => {
            const curve = { 0: 5, 1: 10, 2: 15, 3: 20, 4: 12, 5: 8 };
            const { container } = render(<ManaCurveChart curve={curve} />);

            const bars = container.querySelectorAll('.mana-curve-bar');
            expect(bars).toHaveLength(6);
        });

        it('should display CMC labels', () => {
            const curve = { 1: 10, 2: 15, 3: 20 };
            render(<ManaCurveChart curve={curve} />);

            expect(screen.getByText('1')).toBeInTheDocument();
            expect(screen.getByText('2')).toBeInTheDocument();
            expect(screen.getByText('3')).toBeInTheDocument();
        });

        it('should display card counts above bars', () => {
            const curve = { 1: 10, 2: 15 };
            render(<ManaCurveChart curve={curve} />);

            expect(screen.getByText('10')).toBeInTheDocument();
            expect(screen.getByText('15')).toBeInTheDocument();
        });

        it('should render the CMC label', () => {
            const curve = { 1: 10 };
            render(<ManaCurveChart curve={curve} />);

            expect(screen.getByText('Converted Mana Cost (CMC)')).toBeInTheDocument();
        });

        it('should handle 7+ CMC category', () => {
            const curve = { 1: 10, 2: 15, '7+': 5 };
            render(<ManaCurveChart curve={curve} />);

            expect(screen.getByText('7+')).toBeInTheDocument();
            expect(screen.getByText('5')).toBeInTheDocument();
        });

        it('should sort CMC values correctly', () => {
            const curve = { 3: 20, 1: 10, 2: 15, '7+': 5, 0: 2 };
            const { container } = render(<ManaCurveChart curve={curve} />);

            const columns = container.querySelectorAll('.mana-curve-column');
            const cmcOrder = Array.from(columns).map(col => col.querySelector('strong').textContent);

            expect(cmcOrder).toEqual(['0', '1', '2', '3', '7+']);
        });

        it('should set bar title with CMC and count information', () => {
            const curve = { 2: 15 };
            const { container } = render(<ManaCurveChart curve={curve} />);

            const bar = container.querySelector('.mana-curve-bar');
            expect(bar).toHaveAttribute('title', 'CMC 2: 15 cards');
        });
    });

    describe('bar height calculation', () => {
        it('should set tallest bar to max height (200px)', () => {
            const curve = { 1: 10, 2: 20, 3: 15 }; // 20 is max
            const { container } = render(<ManaCurveChart curve={curve} />);

            const bars = container.querySelectorAll('.mana-curve-bar');
            // Bar for CMC 2 should have height of 200px
            expect(bars[1]).toHaveStyle({ height: '200px' });
        });

        it('should scale other bars proportionally', () => {
            const curve = { 1: 10, 2: 20 }; // 10 is 50% of 20
            const { container } = render(<ManaCurveChart curve={curve} />);

            const bars = container.querySelectorAll('.mana-curve-bar');
            // Bar for CMC 1 should have height of 100px (50% of 200)
            expect(bars[0]).toHaveStyle({ height: '100px' });
        });

        it('should set minHeight for bars with count > 0', () => {
            const curve = { 1: 1, 2: 100 }; // 1 is very small relative to 100
            const { container } = render(<ManaCurveChart curve={curve} />);

            const bars = container.querySelectorAll('.mana-curve-bar');
            // Bar for CMC 1 should have minHeight of 10px
            expect(bars[0]).toHaveStyle({ minHeight: '10px' });
        });

        it('should set minHeight to 0 for bars with count 0', () => {
            const curve = { 1: 0, 2: 10 };
            const { container } = render(<ManaCurveChart curve={curve} />);

            const bars = container.querySelectorAll('.mana-curve-bar');
            // Bar for CMC 1 should have minHeight of 0
            expect(bars[0]).toHaveStyle({ minHeight: '0' });
            expect(bars[0]).toHaveStyle({ height: '0px' });
        });
    });

    describe('rendering with edge cases', () => {
        it('should display message when curve is undefined', () => {
            render(<ManaCurveChart curve={undefined} />);
            expect(screen.getByText('No mana curve data available')).toBeInTheDocument();
        });

        it('should display message when curve is null', () => {
            render(<ManaCurveChart curve={null} />);
            expect(screen.getByText('No mana curve data available')).toBeInTheDocument();
        });

        it('should display message when curve is empty object', () => {
            render(<ManaCurveChart curve={{}} />);
            expect(screen.getByText('No mana curve data available')).toBeInTheDocument();
        });

        it('should handle single CMC entry', () => {
            const curve = { 3: 25 };
            render(<ManaCurveChart curve={curve} />);

            expect(screen.getByText('3')).toBeInTheDocument();
            expect(screen.getByText('25')).toBeInTheDocument();
        });

        it('should handle object format for count values', () => {
            // The component handles both number and object formats
            const curve = { 1: { count: 10 }, 2: 15 };
            render(<ManaCurveChart curve={curve} />);

            expect(screen.getByText('10')).toBeInTheDocument();
            expect(screen.getByText('15')).toBeInTheDocument();
        });

        it('should handle object with missing count property as 0', () => {
            const curve = { 1: { other: 'data' }, 2: 15 };
            render(<ManaCurveChart curve={curve} />);

            expect(screen.getByText('0')).toBeInTheDocument(); // CMC 1 becomes 0
            expect(screen.getByText('15')).toBeInTheDocument();
        });

        it('should handle non-numeric string values as 0', () => {
            const curve = { 1: 'invalid', 2: 15 };
            render(<ManaCurveChart curve={curve} />);

            expect(screen.getByText('0')).toBeInTheDocument(); // 'invalid' becomes 0
            expect(screen.getByText('15')).toBeInTheDocument();
        });

        it('should handle string number values', () => {
            const curve = { 1: '10', 2: '15' };
            render(<ManaCurveChart curve={curve} />);

            expect(screen.getByText('10')).toBeInTheDocument();
            expect(screen.getByText('15')).toBeInTheDocument();
        });

        it('should handle all zero counts', () => {
            const curve = { 1: 0, 2: 0, 3: 0 };
            const { container } = render(<ManaCurveChart curve={curve} />);

            // Should still render the structure
            const bars = container.querySelectorAll('.mana-curve-bar');
            expect(bars).toHaveLength(3);

            // All bars should have height 0
            bars.forEach(bar => {
                expect(bar).toHaveStyle({ height: '0px' });
            });
        });

        it('should handle maxCount of 0 gracefully', () => {
            const curve = { 1: 0 };
            const { container } = render(<ManaCurveChart curve={curve} />);

            const bar = container.querySelector('.mana-curve-bar');
            // When maxCount is 0, height should be 0
            expect(bar).toHaveStyle({ height: '0px' });
        });
    });

    describe('component structure', () => {
        it('should have mana-curve-chart class on container', () => {
            const curve = { 1: 10 };
            const { container } = render(<ManaCurveChart curve={curve} />);

            expect(container.querySelector('.mana-curve-chart')).toBeInTheDocument();
        });

        it('should have mana-curve-container with correct height', () => {
            const curve = { 1: 10 };
            const { container } = render(<ManaCurveChart curve={curve} />);

            const curveContainer = container.querySelector('.mana-curve-container');
            // 200px max height + 60px for labels = 260px
            expect(curveContainer).toHaveStyle({ height: '260px' });
        });

        it('should have mana-curve-column for each CMC', () => {
            const curve = { 1: 10, 2: 15, 3: 20 };
            const { container } = render(<ManaCurveChart curve={curve} />);

            const columns = container.querySelectorAll('.mana-curve-column');
            expect(columns).toHaveLength(3);
        });

        it('should have mana-curve-count class for count display', () => {
            const curve = { 1: 10 };
            const { container } = render(<ManaCurveChart curve={curve} />);

            const countElement = container.querySelector('.mana-curve-count');
            expect(countElement).toBeInTheDocument();
            expect(countElement.textContent).toBe('10');
        });

        it('should have mana-curve-label for CMC label', () => {
            const curve = { 1: 10 };
            const { container } = render(<ManaCurveChart curve={curve} />);

            const labelContainer = container.querySelector('.mana-curve-label');
            expect(labelContainer).toBeInTheDocument();
        });
    });

    describe('full CMC range', () => {
        it('should handle typical Commander deck CMC distribution', () => {
            const curve = {
                0: 5,   // Mana rocks that cost 0
                1: 12,  // Sol Ring, etc.
                2: 18,  // Signets, cheap removal
                3: 22,  // Sweet spot
                4: 15,  // Good value
                5: 10,  // Mid-range
                6: 6,   // Big spells
                '7+': 8 // Bombs and commanders
            };
            const { container } = render(<ManaCurveChart curve={curve} />);

            const bars = container.querySelectorAll('.mana-curve-bar');
            expect(bars).toHaveLength(8);

            // Verify highest bar is CMC 3 with count 22
            const cmcLabels = container.querySelectorAll('.mana-curve-column strong');
            const maxIndex = Array.from(cmcLabels).findIndex(el => el.textContent === '3');
            expect(bars[maxIndex]).toHaveStyle({ height: '200px' });
        });
    });

    describe('styling classes', () => {
        it('should have rounded-top class on bars', () => {
            const curve = { 1: 10 };
            const { container } = render(<ManaCurveChart curve={curve} />);

            const bar = container.querySelector('.mana-curve-bar');
            expect(bar).toHaveClass('rounded-top');
        });

        it('should have text-center on columns', () => {
            const curve = { 1: 10 };
            const { container } = render(<ManaCurveChart curve={curve} />);

            const column = container.querySelector('.mana-curve-column');
            expect(column).toHaveClass('text-center');
        });
    });
});
