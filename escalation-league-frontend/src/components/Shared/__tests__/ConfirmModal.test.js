import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmModal from '../ConfirmModal';

describe('ConfirmModal', () => {
    const defaultProps = {
        show: true,
        title: 'Confirm Action',
        message: 'Are you sure you want to proceed?',
        onConfirm: jest.fn(),
        onCancel: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('rendering', () => {
        it('should not render when show is false', () => {
            render(<ConfirmModal {...defaultProps} show={false} />);
            expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
        });

        it('should render when show is true', () => {
            render(<ConfirmModal {...defaultProps} />);
            expect(screen.getByText('Confirm Action')).toBeInTheDocument();
            expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
        });

        it('should render title', () => {
            render(<ConfirmModal {...defaultProps} title="Delete Item" />);
            expect(screen.getByText('Delete Item')).toBeInTheDocument();
        });

        it('should render message', () => {
            render(<ConfirmModal {...defaultProps} message="This cannot be undone." />);
            expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
        });
    });

    describe('buttons', () => {
        it('should render default button text', () => {
            render(<ConfirmModal {...defaultProps} />);
            expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        });

        it('should render custom confirm text', () => {
            render(<ConfirmModal {...defaultProps} confirmText="Delete" />);
            expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
        });

        it('should render custom cancel text', () => {
            render(<ConfirmModal {...defaultProps} cancelText="Go Back" />);
            expect(screen.getByRole('button', { name: 'Go Back' })).toBeInTheDocument();
        });

        it('should call onConfirm when confirm button is clicked', () => {
            render(<ConfirmModal {...defaultProps} />);
            fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
            expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
        });

        it('should call onCancel when cancel button is clicked', () => {
            render(<ConfirmModal {...defaultProps} />);
            fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
            expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
        });
    });

    describe('type/button styling', () => {
        it('should use danger button class by default', () => {
            render(<ConfirmModal {...defaultProps} />);
            expect(screen.getByRole('button', { name: 'Confirm' })).toHaveClass('btn-danger');
        });

        it('should use danger button class for danger type', () => {
            render(<ConfirmModal {...defaultProps} type="danger" />);
            expect(screen.getByRole('button', { name: 'Confirm' })).toHaveClass('btn-danger');
        });

        it('should use warning button class for warning type', () => {
            render(<ConfirmModal {...defaultProps} type="warning" />);
            expect(screen.getByRole('button', { name: 'Confirm' })).toHaveClass('btn-warning');
        });

        it('should use primary button class for primary type', () => {
            render(<ConfirmModal {...defaultProps} type="primary" />);
            expect(screen.getByRole('button', { name: 'Confirm' })).toHaveClass('btn-primary');
        });

        it('should use danger for unknown type', () => {
            render(<ConfirmModal {...defaultProps} type="unknown" />);
            expect(screen.getByRole('button', { name: 'Confirm' })).toHaveClass('btn-danger');
        });

        it('should have secondary button for cancel', () => {
            render(<ConfirmModal {...defaultProps} />);
            expect(screen.getByRole('button', { name: 'Cancel' })).toHaveClass('btn-secondary');
        });
    });

    describe('close functionality', () => {
        it('should call onCancel when close button is clicked', () => {
            render(<ConfirmModal {...defaultProps} />);
            const closeButton = screen.getByLabelText('Close');
            fireEvent.click(closeButton);
            expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
        });

        it('should call onCancel when backdrop is clicked', () => {
            render(<ConfirmModal {...defaultProps} />);
            const backdrop = document.querySelector('.modal-backdrop');
            fireEvent.click(backdrop);
            expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
        });
    });

    describe('structure', () => {
        it('should have proper Bootstrap modal structure', () => {
            render(<ConfirmModal {...defaultProps} />);
            expect(document.querySelector('.modal')).toBeInTheDocument();
            expect(document.querySelector('.modal-backdrop')).toBeInTheDocument();
            expect(document.querySelector('.modal-dialog')).toBeInTheDocument();
            expect(document.querySelector('.modal-content')).toBeInTheDocument();
            expect(document.querySelector('.modal-header')).toBeInTheDocument();
            expect(document.querySelector('.modal-body')).toBeInTheDocument();
            expect(document.querySelector('.modal-footer')).toBeInTheDocument();
        });

        it('should render modal title in header', () => {
            render(<ConfirmModal {...defaultProps} />);
            expect(document.querySelector('.modal-title')).toHaveTextContent('Confirm Action');
        });
    });
});
