import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CollapsibleSection from './CollapsibleSection';

describe('CollapsibleSection', () => {
    const defaultProps = {
        title: 'Test Section',
        children: <div data-testid="content">Section content</div>
    };

    describe('rendering', () => {
        it('should render title', () => {
            render(<CollapsibleSection {...defaultProps} />);
            expect(screen.getByText('Test Section')).toBeInTheDocument();
        });

        it('should render children when open', () => {
            render(<CollapsibleSection {...defaultProps} />);
            expect(screen.getByTestId('content')).toBeInTheDocument();
        });

        it('should be open by default', () => {
            render(<CollapsibleSection {...defaultProps} />);
            expect(screen.getByTestId('content')).toBeInTheDocument();
        });

        it('should be closed when defaultOpen is false', () => {
            render(<CollapsibleSection {...defaultProps} defaultOpen={false} />);
            expect(screen.queryByTestId('content')).not.toBeInTheDocument();
        });
    });

    describe('icon', () => {
        it('should render icon when provided', () => {
            const { container } = render(
                <CollapsibleSection {...defaultProps} icon="fas fa-cog" />
            );
            expect(container.querySelector('.fa-cog')).toBeInTheDocument();
        });

        it('should not render icon element when not provided', () => {
            const { container } = render(<CollapsibleSection {...defaultProps} />);
            const header = container.querySelector('.card-header');
            // Only the chevron icon should be present
            const icons = header.querySelectorAll('i');
            expect(icons).toHaveLength(1); // Just chevron
        });
    });

    describe('badge', () => {
        it('should render badge when provided', () => {
            render(<CollapsibleSection {...defaultProps} badge={5} />);
            expect(screen.getByText('5')).toBeInTheDocument();
        });

        it('should render string badge', () => {
            render(<CollapsibleSection {...defaultProps} badge="New" />);
            expect(screen.getByText('New')).toBeInTheDocument();
        });

        it('should not render badge when value is 0', () => {
            const { container } = render(<CollapsibleSection {...defaultProps} badge={0} />);
            expect(container.querySelector('.badge')).not.toBeInTheDocument();
        });

        it('should not render badge when null', () => {
            const { container } = render(<CollapsibleSection {...defaultProps} badge={null} />);
            expect(container.querySelector('.badge.bg-secondary')).not.toBeInTheDocument();
        });

        it('should have bg-secondary class on badge', () => {
            const { container } = render(<CollapsibleSection {...defaultProps} badge={10} />);
            expect(container.querySelector('.badge.bg-secondary')).toBeInTheDocument();
        });
    });

    describe('actions', () => {
        it('should render actions when provided', () => {
            render(
                <CollapsibleSection {...defaultProps} actions={<button>Action</button>} />
            );
            expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
        });

        it('should not propagate click from actions to header', () => {
            const actionClick = jest.fn();
            render(
                <CollapsibleSection
                    {...defaultProps}
                    defaultOpen={true}
                    actions={<button onClick={actionClick}>Action</button>}
                />
            );

            fireEvent.click(screen.getByRole('button', { name: 'Action' }));

            // Action should be called
            expect(actionClick).toHaveBeenCalled();
            // Section should still be open (not toggled)
            expect(screen.getByTestId('content')).toBeInTheDocument();
        });
    });

    describe('toggle behavior', () => {
        it('should toggle closed when clicking header', () => {
            render(<CollapsibleSection {...defaultProps} />);

            // Initially open
            expect(screen.getByTestId('content')).toBeInTheDocument();

            // Click header to close
            fireEvent.click(screen.getByText('Test Section'));

            expect(screen.queryByTestId('content')).not.toBeInTheDocument();
        });

        it('should toggle open when clicking header on closed section', () => {
            render(<CollapsibleSection {...defaultProps} defaultOpen={false} />);

            // Initially closed
            expect(screen.queryByTestId('content')).not.toBeInTheDocument();

            // Click header to open
            fireEvent.click(screen.getByText('Test Section'));

            expect(screen.getByTestId('content')).toBeInTheDocument();
        });

        it('should toggle multiple times', () => {
            render(<CollapsibleSection {...defaultProps} />);

            // Start open
            expect(screen.getByTestId('content')).toBeInTheDocument();

            // Close
            fireEvent.click(screen.getByText('Test Section'));
            expect(screen.queryByTestId('content')).not.toBeInTheDocument();

            // Open again
            fireEvent.click(screen.getByText('Test Section'));
            expect(screen.getByTestId('content')).toBeInTheDocument();
        });
    });

    describe('chevron icon', () => {
        it('should show chevron-up when open', () => {
            const { container } = render(<CollapsibleSection {...defaultProps} />);
            expect(container.querySelector('.fa-chevron-up')).toBeInTheDocument();
        });

        it('should show chevron-down when closed', () => {
            const { container } = render(<CollapsibleSection {...defaultProps} defaultOpen={false} />);
            expect(container.querySelector('.fa-chevron-down')).toBeInTheDocument();
        });

        it('should update chevron on toggle', () => {
            const { container } = render(<CollapsibleSection {...defaultProps} />);

            expect(container.querySelector('.fa-chevron-up')).toBeInTheDocument();

            fireEvent.click(screen.getByText('Test Section'));

            expect(container.querySelector('.fa-chevron-down')).toBeInTheDocument();
        });
    });

    describe('id prop', () => {
        it('should apply id to container', () => {
            const { container } = render(<CollapsibleSection {...defaultProps} id="test-section" />);
            expect(container.querySelector('#test-section')).toBeInTheDocument();
        });
    });

    describe('structure', () => {
        it('should have card structure', () => {
            const { container } = render(<CollapsibleSection {...defaultProps} />);
            expect(container.querySelector('.card')).toBeInTheDocument();
            expect(container.querySelector('.card-header')).toBeInTheDocument();
            expect(container.querySelector('.card-body')).toBeInTheDocument();
        });

        it('should have cursor pointer on header', () => {
            const { container } = render(<CollapsibleSection {...defaultProps} />);
            const header = container.querySelector('.card-header');
            expect(header).toHaveStyle({ cursor: 'pointer' });
        });
    });
});
