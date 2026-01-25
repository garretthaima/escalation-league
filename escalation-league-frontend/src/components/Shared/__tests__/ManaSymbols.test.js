import React from 'react';
import { render, screen } from '@testing-library/react';
import ManaSymbol, { MANA_SVGS, getManaStyle } from '../ManaSymbols';

describe('ManaSymbol', () => {
    describe('rendering valid colors', () => {
        it('should render White (W) mana symbol', () => {
            const { container } = render(<ManaSymbol color="W" />);
            expect(container.querySelector('.mana-symbol')).toBeInTheDocument();
            expect(container.querySelector('svg')).toBeInTheDocument();
        });

        it('should render Blue (U) mana symbol', () => {
            const { container } = render(<ManaSymbol color="U" />);
            expect(container.querySelector('.mana-symbol')).toBeInTheDocument();
            expect(container.querySelector('svg')).toBeInTheDocument();
        });

        it('should render Black (B) mana symbol', () => {
            const { container } = render(<ManaSymbol color="B" />);
            expect(container.querySelector('.mana-symbol')).toBeInTheDocument();
            expect(container.querySelector('svg')).toBeInTheDocument();
        });

        it('should render Red (R) mana symbol', () => {
            const { container } = render(<ManaSymbol color="R" />);
            expect(container.querySelector('.mana-symbol')).toBeInTheDocument();
            expect(container.querySelector('svg')).toBeInTheDocument();
        });

        it('should render Green (G) mana symbol', () => {
            const { container } = render(<ManaSymbol color="G" />);
            expect(container.querySelector('.mana-symbol')).toBeInTheDocument();
            expect(container.querySelector('svg')).toBeInTheDocument();
        });

        it('should render Colorless (C) mana symbol', () => {
            const { container } = render(<ManaSymbol color="C" />);
            expect(container.querySelector('.mana-symbol')).toBeInTheDocument();
            expect(container.querySelector('svg')).toBeInTheDocument();
        });
    });

    describe('invalid color handling', () => {
        it('should return null for invalid color', () => {
            const { container } = render(<ManaSymbol color="X" />);
            expect(container.querySelector('.mana-symbol')).not.toBeInTheDocument();
        });

        it('should return null for empty color', () => {
            const { container } = render(<ManaSymbol color="" />);
            expect(container.querySelector('.mana-symbol')).not.toBeInTheDocument();
        });

        it('should return null for undefined color', () => {
            const { container } = render(<ManaSymbol />);
            expect(container.querySelector('.mana-symbol')).not.toBeInTheDocument();
        });
    });

    describe('size prop', () => {
        it('should use default size of 20', () => {
            const { container } = render(<ManaSymbol color="W" />);
            const span = container.querySelector('.mana-symbol');
            expect(span).toHaveStyle({ width: '20px', height: '20px' });
        });

        it('should use custom size when provided', () => {
            const { container } = render(<ManaSymbol color="W" size={30} />);
            const span = container.querySelector('.mana-symbol');
            expect(span).toHaveStyle({ width: '30px', height: '30px' });
        });

        it('should use large size', () => {
            const { container } = render(<ManaSymbol color="W" size={50} />);
            const span = container.querySelector('.mana-symbol');
            expect(span).toHaveStyle({ width: '50px', height: '50px' });
        });

        it('should use small size', () => {
            const { container } = render(<ManaSymbol color="W" size={10} />);
            const span = container.querySelector('.mana-symbol');
            expect(span).toHaveStyle({ width: '10px', height: '10px' });
        });
    });

    describe('className prop', () => {
        it('should include default mana-symbol class', () => {
            const { container } = render(<ManaSymbol color="W" />);
            const span = container.querySelector('span');
            expect(span).toHaveClass('mana-symbol');
        });

        it('should include custom className when provided', () => {
            const { container } = render(<ManaSymbol color="W" className="custom-class" />);
            const span = container.querySelector('span');
            expect(span).toHaveClass('mana-symbol', 'custom-class');
        });

        it('should include multiple custom classNames', () => {
            const { container } = render(<ManaSymbol color="W" className="class1 class2" />);
            const span = container.querySelector('span');
            expect(span).toHaveClass('mana-symbol', 'class1', 'class2');
        });

        it('should have empty className by default', () => {
            const { container } = render(<ManaSymbol color="W" />);
            const span = container.querySelector('span');
            // The class should be "mana-symbol " (with trailing space due to template literal)
            expect(span.className.trim()).toBe('mana-symbol');
        });
    });

    describe('inline styles', () => {
        it('should have inline-block display', () => {
            const { container } = render(<ManaSymbol color="W" />);
            const span = container.querySelector('.mana-symbol');
            expect(span).toHaveStyle({ display: 'inline-block' });
        });

        it('should have vertical-align middle', () => {
            const { container } = render(<ManaSymbol color="W" />);
            const span = container.querySelector('.mana-symbol');
            expect(span).toHaveStyle({ verticalAlign: 'middle' });
        });

        it('should have border-radius 50%', () => {
            const { container } = render(<ManaSymbol color="W" />);
            const span = container.querySelector('.mana-symbol');
            expect(span).toHaveStyle({ borderRadius: '50%' });
        });

        it('should have box-shadow', () => {
            const { container } = render(<ManaSymbol color="W" />);
            const span = container.querySelector('.mana-symbol');
            expect(span).toHaveStyle({ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)' });
        });
    });

    describe('SVG content', () => {
        it('should render SVG with mana-svg class for each color', () => {
            const colors = ['W', 'U', 'B', 'R', 'G', 'C'];
            colors.forEach(color => {
                const { container, unmount } = render(<ManaSymbol color={color} />);
                expect(container.querySelector('svg.mana-svg')).toBeInTheDocument();
                unmount();
            });
        });

        it('should render SVG with correct viewBox', () => {
            const { container } = render(<ManaSymbol color="W" />);
            const svg = container.querySelector('svg');
            expect(svg).toHaveAttribute('viewBox', '0 0 100 100');
        });
    });
});

describe('MANA_SVGS', () => {
    it('should have all WUBRG colors plus colorless', () => {
        expect(MANA_SVGS).toHaveProperty('W');
        expect(MANA_SVGS).toHaveProperty('U');
        expect(MANA_SVGS).toHaveProperty('B');
        expect(MANA_SVGS).toHaveProperty('R');
        expect(MANA_SVGS).toHaveProperty('G');
        expect(MANA_SVGS).toHaveProperty('C');
    });

    it('should have exactly 6 mana symbols', () => {
        expect(Object.keys(MANA_SVGS)).toHaveLength(6);
    });

    it('should have React elements for each color', () => {
        Object.values(MANA_SVGS).forEach(svg => {
            expect(React.isValidElement(svg)).toBe(true);
        });
    });
});

describe('getManaStyle', () => {
    it('should return default style with size 20', () => {
        const style = getManaStyle();
        expect(style).toEqual({
            width: 20,
            height: 20,
            display: 'inline-block',
            verticalAlign: 'middle',
            borderRadius: '50%',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
        });
    });

    it('should return style with custom size', () => {
        const style = getManaStyle(40);
        expect(style.width).toBe(40);
        expect(style.height).toBe(40);
    });

    it('should preserve other style properties with custom size', () => {
        const style = getManaStyle(40);
        expect(style.display).toBe('inline-block');
        expect(style.verticalAlign).toBe('middle');
        expect(style.borderRadius).toBe('50%');
        expect(style.boxShadow).toBe('0 1px 3px rgba(0, 0, 0, 0.3)');
    });

    it('should work with size 0', () => {
        const style = getManaStyle(0);
        expect(style.width).toBe(0);
        expect(style.height).toBe(0);
    });

    it('should work with large size', () => {
        const style = getManaStyle(100);
        expect(style.width).toBe(100);
        expect(style.height).toBe(100);
    });
});
