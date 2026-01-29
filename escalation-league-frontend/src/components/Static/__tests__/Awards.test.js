import React from 'react';
import { render, screen } from '@testing-library/react';
import Awards from '../Awards';

describe('Awards', () => {
    describe('rendering', () => {
        it('should render the awards container', () => {
            const { container } = render(<Awards />);
            expect(container.querySelector('.container')).toBeInTheDocument();
        });

        it('should render the page heading', () => {
            render(<Awards />);
            expect(screen.getByRole('heading', { name: 'Awards' })).toBeInTheDocument();
        });

        it('should render the coming soon message', () => {
            render(<Awards />);
            expect(screen.getByText('Coming Soon...')).toBeInTheDocument();
        });
    });

    describe('styling', () => {
        it('should have container class', () => {
            const { container } = render(<Awards />);
            expect(container.querySelector('.container')).toBeInTheDocument();
        });

        it('should have mt-5 margin class', () => {
            const { container } = render(<Awards />);
            expect(container.querySelector('.mt-5')).toBeInTheDocument();
        });

        it('should have text-center class', () => {
            const { container } = render(<Awards />);
            expect(container.querySelector('.text-center')).toBeInTheDocument();
        });

        it('should have mt-3 class on coming soon paragraph', () => {
            render(<Awards />);
            const paragraph = screen.getByText('Coming Soon...');
            expect(paragraph).toHaveClass('mt-3');
        });
    });

    describe('structure', () => {
        it('should have h1 heading', () => {
            render(<Awards />);
            const heading = screen.getByRole('heading', { level: 1 });
            expect(heading).toHaveTextContent('Awards');
        });

        it('should have exactly one heading', () => {
            render(<Awards />);
            const headings = screen.getAllByRole('heading');
            expect(headings).toHaveLength(1);
        });

        it('should render heading before paragraph', () => {
            const { container } = render(<Awards />);
            const heading = container.querySelector('h1');
            const paragraph = container.querySelector('p');
            expect(heading.compareDocumentPosition(paragraph)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
        });
    });

    describe('accessibility', () => {
        it('should have proper heading hierarchy', () => {
            render(<Awards />);
            const h1 = screen.getByRole('heading', { level: 1 });
            expect(h1).toBeInTheDocument();
        });

        it('should be readable by screen readers', () => {
            render(<Awards />);
            expect(screen.getByText('Awards')).toBeVisible();
            expect(screen.getByText('Coming Soon...')).toBeVisible();
        });
    });
});
