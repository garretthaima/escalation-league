import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DeclareResultModal from '../DeclareResultModal';

describe('DeclareResultModal', () => {
    const defaultProps = {
        show: true,
        onHide: jest.fn(),
        onDeclareWin: jest.fn(),
        onDeclareDraw: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('rendering - hidden state', () => {
        it('should not render when show is false', () => {
            render(<DeclareResultModal {...defaultProps} show={false} />);
            expect(screen.queryByText('Declare Game Result')).not.toBeInTheDocument();
        });
    });

    describe('rendering - main view', () => {
        it('should render modal when show is true', () => {
            render(<DeclareResultModal {...defaultProps} />);
            expect(screen.getByText('Declare Game Result')).toBeInTheDocument();
        });

        it('should render modal header with title', () => {
            render(<DeclareResultModal {...defaultProps} />);
            expect(screen.getByText('Declare Game Result')).toBeInTheDocument();
        });

        it('should render close button in header', () => {
            render(<DeclareResultModal {...defaultProps} />);
            expect(screen.getByLabelText('Close')).toBeInTheDocument();
        });

        it('should render explanation text', () => {
            render(<DeclareResultModal {...defaultProps} />);
            expect(screen.getByText(/How did this game end/)).toBeInTheDocument();
        });

        it('should render I Won button', () => {
            render(<DeclareResultModal {...defaultProps} />);
            expect(screen.getByText('I Won!')).toBeInTheDocument();
        });

        it('should render Declare Draw button', () => {
            render(<DeclareResultModal {...defaultProps} />);
            expect(screen.getByText('Declare Draw')).toBeInTheDocument();
        });

        it('should render Cancel button', () => {
            render(<DeclareResultModal {...defaultProps} />);
            expect(screen.getByText('Cancel')).toBeInTheDocument();
        });

        it('should render trophy icon in I Won button', () => {
            const { container } = render(<DeclareResultModal {...defaultProps} />);
            const wonButton = screen.getByText('I Won!').closest('button');
            expect(wonButton.querySelector('.fa-trophy')).toBeInTheDocument();
        });

        it('should render handshake icon in Declare Draw button', () => {
            const { container } = render(<DeclareResultModal {...defaultProps} />);
            const drawButton = screen.getByText('Declare Draw').closest('button');
            expect(drawButton.querySelector('.fa-handshake')).toBeInTheDocument();
        });
    });

    describe('main view actions', () => {
        it('should call onHide when clicking Cancel button', () => {
            render(<DeclareResultModal {...defaultProps} />);
            fireEvent.click(screen.getByText('Cancel'));
            expect(defaultProps.onHide).toHaveBeenCalled();
        });

        it('should call onHide when clicking close button', () => {
            render(<DeclareResultModal {...defaultProps} />);
            fireEvent.click(screen.getByLabelText('Close'));
            expect(defaultProps.onHide).toHaveBeenCalled();
        });

        it('should call onDeclareDraw when clicking Declare Draw button', () => {
            render(<DeclareResultModal {...defaultProps} />);
            fireEvent.click(screen.getByText('Declare Draw'));
            expect(defaultProps.onDeclareDraw).toHaveBeenCalled();
        });

        it('should switch to confirmation view when clicking I Won button', () => {
            render(<DeclareResultModal {...defaultProps} />);
            fireEvent.click(screen.getByText('I Won!'));
            // Should now show confirmation view
            expect(screen.getByText('Confirm Your Win')).toBeInTheDocument();
        });
    });

    describe('rendering - confirmation view', () => {
        it('should render confirmation title after clicking I Won', () => {
            render(<DeclareResultModal {...defaultProps} />);
            fireEvent.click(screen.getByText('I Won!'));
            expect(screen.getByText('Confirm Your Win')).toBeInTheDocument();
        });

        it('should render confirmation question', () => {
            render(<DeclareResultModal {...defaultProps} />);
            fireEvent.click(screen.getByText('I Won!'));
            expect(screen.getByText('Are you sure you want to declare yourself as the winner?')).toBeInTheDocument();
        });

        it('should render notification explanation', () => {
            render(<DeclareResultModal {...defaultProps} />);
            fireEvent.click(screen.getByText('I Won!'));
            expect(screen.getByText(/All other players will be notified/)).toBeInTheDocument();
        });

        it('should render Back button in confirmation view', () => {
            render(<DeclareResultModal {...defaultProps} />);
            fireEvent.click(screen.getByText('I Won!'));
            expect(screen.getByText('Back')).toBeInTheDocument();
        });

        it('should render Yes, I Won button in confirmation view', () => {
            render(<DeclareResultModal {...defaultProps} />);
            fireEvent.click(screen.getByText('I Won!'));
            expect(screen.getByText('Yes, I Won')).toBeInTheDocument();
        });

        it('should render close button in confirmation view', () => {
            render(<DeclareResultModal {...defaultProps} />);
            fireEvent.click(screen.getByText('I Won!'));
            expect(screen.getByLabelText('Close')).toBeInTheDocument();
        });

        it('should render trophy icon in confirmation header', () => {
            render(<DeclareResultModal {...defaultProps} />);
            fireEvent.click(screen.getByText('I Won!'));
            const header = screen.getByText('Confirm Your Win').closest('.modal-header');
            expect(header.querySelector('.fa-trophy')).toBeInTheDocument();
        });

        it('should render check icon in Yes, I Won button', () => {
            render(<DeclareResultModal {...defaultProps} />);
            fireEvent.click(screen.getByText('I Won!'));
            const confirmButton = screen.getByText('Yes, I Won').closest('button');
            expect(confirmButton.querySelector('.fa-check')).toBeInTheDocument();
        });
    });

    describe('confirmation view actions', () => {
        it('should call onDeclareWin when clicking Yes, I Won button', () => {
            render(<DeclareResultModal {...defaultProps} />);
            fireEvent.click(screen.getByText('I Won!'));
            fireEvent.click(screen.getByText('Yes, I Won'));
            expect(defaultProps.onDeclareWin).toHaveBeenCalled();
        });

        it('should go back to main view when clicking Back button', () => {
            render(<DeclareResultModal {...defaultProps} />);
            fireEvent.click(screen.getByText('I Won!'));
            expect(screen.getByText('Confirm Your Win')).toBeInTheDocument();

            fireEvent.click(screen.getByText('Back'));
            expect(screen.getByText('Declare Game Result')).toBeInTheDocument();
        });

        it('should call onHide when clicking close button in confirmation view', () => {
            render(<DeclareResultModal {...defaultProps} />);
            fireEvent.click(screen.getByText('I Won!'));
            fireEvent.click(screen.getByLabelText('Close'));
            expect(defaultProps.onHide).toHaveBeenCalled();
        });
    });

    describe('state reset', () => {
        it('should reset to main view when modal is reopened', () => {
            const { rerender } = render(<DeclareResultModal {...defaultProps} />);

            // Go to confirmation view
            fireEvent.click(screen.getByText('I Won!'));
            expect(screen.getByText('Confirm Your Win')).toBeInTheDocument();

            // Close modal
            rerender(<DeclareResultModal {...defaultProps} show={false} />);

            // Reopen modal
            rerender(<DeclareResultModal {...defaultProps} show={true} />);

            // Should be back to main view
            expect(screen.getByText('Declare Game Result')).toBeInTheDocument();
        });

        it('should reset confirmation state when clicking close button', () => {
            render(<DeclareResultModal {...defaultProps} />);

            // Go to confirmation view
            fireEvent.click(screen.getByText('I Won!'));
            expect(screen.getByText('Confirm Your Win')).toBeInTheDocument();

            // Click close - this resets state and calls onHide
            fireEvent.click(screen.getByLabelText('Close'));

            // onHide should be called
            expect(defaultProps.onHide).toHaveBeenCalled();
        });
    });

    describe('modal structure', () => {
        it('should render modal backdrop', () => {
            render(<DeclareResultModal {...defaultProps} />);
            const backdrop = document.querySelector('.modal-backdrop');
            expect(backdrop).toBeInTheDocument();
        });

        it('should render modal dialog', () => {
            render(<DeclareResultModal {...defaultProps} />);
            const dialog = document.querySelector('.modal-dialog');
            expect(dialog).toBeInTheDocument();
        });

        it('should render modal content', () => {
            render(<DeclareResultModal {...defaultProps} />);
            const content = document.querySelector('.modal-content');
            expect(content).toBeInTheDocument();
        });

        it('should render modal header', () => {
            render(<DeclareResultModal {...defaultProps} />);
            const header = document.querySelector('.modal-header');
            expect(header).toBeInTheDocument();
        });

        it('should render modal body', () => {
            render(<DeclareResultModal {...defaultProps} />);
            const body = document.querySelector('.modal-body');
            expect(body).toBeInTheDocument();
        });

        it('should render modal footer', () => {
            render(<DeclareResultModal {...defaultProps} />);
            const footer = document.querySelector('.modal-footer');
            expect(footer).toBeInTheDocument();
        });
    });

    describe('button styling', () => {
        it('should have correct styling on I Won button', () => {
            render(<DeclareResultModal {...defaultProps} />);
            const wonButton = screen.getByText('I Won!').closest('button');
            // The button should have inline styles for brand-gold
            expect(wonButton).toHaveStyle('font-weight: 600');
        });

        it('should have secondary class on Cancel button', () => {
            render(<DeclareResultModal {...defaultProps} />);
            const cancelButton = screen.getByText('Cancel');
            expect(cancelButton).toHaveClass('btn-secondary');
        });

        it('should have outline-secondary class on Declare Draw button', () => {
            render(<DeclareResultModal {...defaultProps} />);
            const drawButton = screen.getByText('Declare Draw').closest('button');
            expect(drawButton).toHaveClass('btn-outline-secondary');
        });
    });

    describe('modal visibility class', () => {
        it('should have show class on modal when visible', () => {
            render(<DeclareResultModal {...defaultProps} />);
            const modal = document.querySelector('.modal');
            expect(modal).toHaveClass('show');
        });

        it('should have fade class on backdrop', () => {
            render(<DeclareResultModal {...defaultProps} />);
            const backdrop = document.querySelector('.modal-backdrop');
            expect(backdrop).toHaveClass('fade', 'show');
        });
    });

    describe('accessibility', () => {
        it('should have aria-label on close button', () => {
            render(<DeclareResultModal {...defaultProps} />);
            expect(screen.getByLabelText('Close')).toBeInTheDocument();
        });

        it('should have tabIndex on modal', () => {
            render(<DeclareResultModal {...defaultProps} />);
            const modal = document.querySelector('.modal');
            expect(modal).toHaveAttribute('tabIndex', '-1');
        });
    });

    describe('confirmation view backdrop', () => {
        it('should render modal backdrop in confirmation view', () => {
            render(<DeclareResultModal {...defaultProps} />);
            fireEvent.click(screen.getByText('I Won!'));
            const backdrop = document.querySelector('.modal-backdrop');
            expect(backdrop).toBeInTheDocument();
        });
    });

    describe('button layout', () => {
        it('should have flex-fill class on Back and Yes, I Won buttons in confirmation view', () => {
            render(<DeclareResultModal {...defaultProps} />);
            fireEvent.click(screen.getByText('I Won!'));

            const backButton = screen.getByText('Back');
            const confirmButton = screen.getByText('Yes, I Won').closest('button');

            expect(backButton).toHaveClass('flex-fill');
            expect(confirmButton).toHaveClass('flex-fill');
        });

        it('should have flex-column class on footer in main view', () => {
            render(<DeclareResultModal {...defaultProps} />);
            const footer = document.querySelector('.modal-footer');
            expect(footer).toHaveClass('flex-column');
        });

        it('should have w-100 class on I Won button', () => {
            render(<DeclareResultModal {...defaultProps} />);
            const wonButton = screen.getByText('I Won!').closest('button');
            expect(wonButton).toHaveClass('w-100');
        });
    });

    describe('icon classes', () => {
        it('should have flag-checkered icon in main view header', () => {
            render(<DeclareResultModal {...defaultProps} />);
            const header = document.querySelector('.modal-header');
            expect(header.querySelector('.fa-flag-checkered')).toBeInTheDocument();
        });
    });

    describe('edge cases', () => {
        it('should handle rapid toggling between views', () => {
            render(<DeclareResultModal {...defaultProps} />);

            // Rapidly toggle multiple times
            fireEvent.click(screen.getByText('I Won!'));
            expect(screen.getByText('Confirm Your Win')).toBeInTheDocument();

            fireEvent.click(screen.getByText('Back'));
            expect(screen.getByText('Declare Game Result')).toBeInTheDocument();

            fireEvent.click(screen.getByText('I Won!'));
            expect(screen.getByText('Confirm Your Win')).toBeInTheDocument();

            fireEvent.click(screen.getByText('Back'));
            expect(screen.getByText('Declare Game Result')).toBeInTheDocument();
        });

        it('should handle clicking I Won and then Cancel', () => {
            render(<DeclareResultModal {...defaultProps} />);

            // Go to confirmation view
            fireEvent.click(screen.getByText('I Won!'));

            // Go back
            fireEvent.click(screen.getByText('Back'));

            // Then cancel
            fireEvent.click(screen.getByText('Cancel'));

            expect(defaultProps.onHide).toHaveBeenCalled();
        });

        it('should not call any handler multiple times on single click', () => {
            render(<DeclareResultModal {...defaultProps} />);

            fireEvent.click(screen.getByText('I Won!'));
            fireEvent.click(screen.getByText('Yes, I Won'));

            expect(defaultProps.onDeclareWin).toHaveBeenCalledTimes(1);
        });

        it('should not call onDeclareDraw multiple times on single click', () => {
            render(<DeclareResultModal {...defaultProps} />);

            fireEvent.click(screen.getByText('Declare Draw'));

            expect(defaultProps.onDeclareDraw).toHaveBeenCalledTimes(1);
        });
    });

    describe('text content', () => {
        it('should have correct text in main view body', () => {
            render(<DeclareResultModal {...defaultProps} />);
            expect(screen.getByText('How did this game end? Other players will be notified to confirm the result.')).toBeInTheDocument();
        });

        it('should have correct text in confirmation view body', () => {
            render(<DeclareResultModal {...defaultProps} />);
            fireEvent.click(screen.getByText('I Won!'));
            expect(screen.getByText('Are you sure you want to declare yourself as the winner?')).toBeInTheDocument();
            expect(screen.getByText('All other players will be notified and asked to confirm the result.')).toBeInTheDocument();
        });
    });
});
