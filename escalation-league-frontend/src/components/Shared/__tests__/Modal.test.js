import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from '../Modal';

describe('Modal', () => {
    const defaultProps = {
        show: true,
        onHide: jest.fn(),
        title: 'Test Modal'
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('rendering', () => {
        it('should not render when show is false', () => {
            const { container } = render(<Modal {...defaultProps} show={false} />);
            expect(container.firstChild).toBeNull();
        });

        it('should render when show is true', () => {
            render(<Modal {...defaultProps} />);
            expect(screen.getByText('Test Modal')).toBeInTheDocument();
        });

        it('should render title', () => {
            render(<Modal {...defaultProps} title="Custom Title" />);
            expect(screen.getByText('Custom Title')).toBeInTheDocument();
        });

        it('should render children', () => {
            render(
                <Modal {...defaultProps}>
                    <div data-testid="content">Modal content</div>
                </Modal>
            );
            expect(screen.getByTestId('content')).toBeInTheDocument();
            expect(screen.getByText('Modal content')).toBeInTheDocument();
        });

        it('should render footer when provided', () => {
            render(
                <Modal {...defaultProps} footer={<button>Save</button>} />
            );
            expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
        });

        it('should not render footer when not provided', () => {
            const { container } = render(<Modal {...defaultProps} />);
            expect(container.querySelector('.modal-footer')).not.toBeInTheDocument();
        });
    });

    describe('header icon', () => {
        it('should render header icon when provided', () => {
            const { container } = render(
                <Modal {...defaultProps} headerIcon="fas fa-info-circle" />
            );
            expect(container.querySelector('.fa-info-circle')).toBeInTheDocument();
        });

        it('should not render icon element when not provided', () => {
            const { container } = render(<Modal {...defaultProps} />);
            const header = container.querySelector('.modal-header');
            expect(header.querySelector('i')).not.toBeInTheDocument();
        });
    });

    describe('size', () => {
        it('should apply default lg size', () => {
            const { container } = render(<Modal {...defaultProps} />);
            expect(container.querySelector('.modal-lg')).toBeInTheDocument();
        });

        it('should apply sm size', () => {
            const { container } = render(<Modal {...defaultProps} size="sm" />);
            expect(container.querySelector('.modal-sm')).toBeInTheDocument();
        });

        it('should apply xl size', () => {
            const { container } = render(<Modal {...defaultProps} size="xl" />);
            expect(container.querySelector('.modal-xl')).toBeInTheDocument();
        });
    });

    describe('close functionality', () => {
        it('should call onHide when close button is clicked', () => {
            render(<Modal {...defaultProps} />);
            const closeButton = screen.getByRole('button', { name: 'Close' });
            fireEvent.click(closeButton);
            expect(defaultProps.onHide).toHaveBeenCalledTimes(1);
        });

        it('should call onHide when backdrop is clicked by default', () => {
            const { container } = render(<Modal {...defaultProps} />);
            const backdrop = container.querySelector('.modal-backdrop');
            fireEvent.click(backdrop);
            expect(defaultProps.onHide).toHaveBeenCalledTimes(1);
        });

        it('should not call onHide when backdrop is clicked with closeOnBackdrop=false', () => {
            const { container } = render(
                <Modal {...defaultProps} closeOnBackdrop={false} />
            );
            const backdrop = container.querySelector('.modal-backdrop');
            fireEvent.click(backdrop);
            expect(defaultProps.onHide).not.toHaveBeenCalled();
        });

        it('should call onHide when modal overlay is clicked', () => {
            const { container } = render(<Modal {...defaultProps} />);
            // Click on the modal overlay (the .modal element, not the dialog)
            const modal = container.querySelector('.modal');
            fireEvent.click(modal);
            expect(defaultProps.onHide).toHaveBeenCalled();
        });

        it('should not close when clicking inside modal content', () => {
            render(
                <Modal {...defaultProps}>
                    <button>Inside button</button>
                </Modal>
            );
            fireEvent.click(screen.getByText('Inside button'));
            expect(defaultProps.onHide).not.toHaveBeenCalled();
        });
    });

    describe('className prop', () => {
        it('should apply additional className', () => {
            const { container } = render(
                <Modal {...defaultProps} className="custom-modal" />
            );
            expect(container.querySelector('.custom-modal')).toBeInTheDocument();
        });
    });

    describe('structure', () => {
        it('should have proper modal structure', () => {
            const { container } = render(<Modal {...defaultProps} />);
            expect(container.querySelector('.modal')).toBeInTheDocument();
            expect(container.querySelector('.modal-dialog')).toBeInTheDocument();
            expect(container.querySelector('.modal-content')).toBeInTheDocument();
            expect(container.querySelector('.modal-header')).toBeInTheDocument();
            expect(container.querySelector('.modal-body')).toBeInTheDocument();
            expect(container.querySelector('.modal-backdrop')).toBeInTheDocument();
        });

        it('should have display block style when shown', () => {
            const { container } = render(<Modal {...defaultProps} />);
            const modal = container.querySelector('.modal');
            expect(modal).toHaveStyle({ display: 'block' });
        });
    });

    describe('accessibility', () => {
        it('should have close button with aria-label', () => {
            render(<Modal {...defaultProps} />);
            expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
        });

        it('should have tabindex on modal', () => {
            const { container } = render(<Modal {...defaultProps} />);
            const modal = container.querySelector('.modal');
            expect(modal).toHaveAttribute('tabindex', '-1');
        });
    });
});
