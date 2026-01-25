import React from 'react';
import { render, screen } from '@testing-library/react';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
    describe('rendering', () => {
        it('should render with all props', () => {
            render(
                <EmptyState
                    icon="fas fa-inbox"
                    title="No items found"
                    description="Try adjusting your filters"
                    action={<button>Add Item</button>}
                />
            );

            expect(screen.getByText('No items found')).toBeInTheDocument();
            expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument();
        });

        it('should render with just title', () => {
            render(<EmptyState title="No data" />);
            expect(screen.getByText('No data')).toBeInTheDocument();
        });

        it('should render with just description', () => {
            render(<EmptyState description="Nothing to show here" />);
            expect(screen.getByText('Nothing to show here')).toBeInTheDocument();
        });

        it('should render empty div when no props provided', () => {
            const { container } = render(<EmptyState />);
            expect(container.querySelector('.text-center')).toBeInTheDocument();
        });
    });

    describe('icon', () => {
        it('should render icon when provided', () => {
            const { container } = render(<EmptyState icon="fas fa-inbox" />);
            const icon = container.querySelector('.fa-inbox');
            expect(icon).toBeInTheDocument();
        });

        it('should not render icon element when not provided', () => {
            const { container } = render(<EmptyState title="No icon" />);
            const icon = container.querySelector('i');
            expect(icon).not.toBeInTheDocument();
        });

        it('should apply fa-3x class to icon', () => {
            const { container } = render(<EmptyState icon="fas fa-search" />);
            const icon = container.querySelector('i');
            expect(icon).toHaveClass('fa-3x');
        });
    });

    describe('title', () => {
        it('should render title in h5 element', () => {
            render(<EmptyState title="Test Title" />);
            const heading = screen.getByRole('heading', { level: 5 });
            expect(heading).toHaveTextContent('Test Title');
        });

        it('should apply text-muted class to title', () => {
            render(<EmptyState title="Test Title" />);
            const heading = screen.getByRole('heading', { level: 5 });
            expect(heading).toHaveClass('text-muted');
        });
    });

    describe('description', () => {
        it('should render description in paragraph', () => {
            render(<EmptyState description="Test description" />);
            expect(screen.getByText('Test description')).toBeInTheDocument();
        });

        it('should apply text-muted class to description', () => {
            render(<EmptyState description="Test description" />);
            const description = screen.getByText('Test description');
            expect(description).toHaveClass('text-muted');
        });
    });

    describe('action', () => {
        it('should render action node', () => {
            render(<EmptyState action={<a href="/create">Create New</a>} />);
            expect(screen.getByRole('link', { name: 'Create New' })).toBeInTheDocument();
        });

        it('should render complex action elements', () => {
            render(
                <EmptyState
                    action={
                        <div>
                            <button>Primary Action</button>
                            <button>Secondary Action</button>
                        </div>
                    }
                />
            );
            expect(screen.getByRole('button', { name: 'Primary Action' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Secondary Action' })).toBeInTheDocument();
        });
    });

    describe('className', () => {
        it('should apply custom className', () => {
            const { container } = render(<EmptyState className="custom-class" />);
            expect(container.firstChild).toHaveClass('custom-class');
        });

        it('should preserve default classes when custom className is added', () => {
            const { container } = render(<EmptyState className="custom-class" />);
            expect(container.firstChild).toHaveClass('text-center');
            expect(container.firstChild).toHaveClass('py-5');
        });

        it('should work without className prop', () => {
            const { container } = render(<EmptyState />);
            expect(container.firstChild).toHaveClass('text-center');
        });
    });

    describe('styling', () => {
        it('should have centered text', () => {
            const { container } = render(<EmptyState title="Test" />);
            expect(container.firstChild).toHaveClass('text-center');
        });

        it('should have vertical padding', () => {
            const { container } = render(<EmptyState title="Test" />);
            expect(container.firstChild).toHaveClass('py-5');
        });
    });
});
