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
            const { container } = render(<ConfirmModal {...defaultProps} show={false} />);
            expect(container.firstChild).toBeNull();
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
            const { container } = render(<ConfirmModal {...defaultProps} />);
            expect(container.querySelector('.btn-danger')).toBeInTheDocument();
        });

        it('should use danger button class for danger type', () => {
            const { container } = render(<ConfirmModal {...defaultProps} type="danger" />);
            expect(container.querySelector('.btn-danger')).toBeInTheDocument();
        });

        it('should use warning button class for warning type', () => {
            const { container } = render(<ConfirmModal {...defaultProps} type="warning" />);
            expect(container.querySelector('.btn-warning')).toBeInTheDocument();
        });

        it('should use primary button class for primary type', () => {
            const { container } = render(<ConfirmModal {...defaultProps} type="primary" />);
            expect(container.querySelector('.btn-primary')).toBeInTheDocument();
        });

        it('should use danger for unknown type', () => {
            const { container } = render(<ConfirmModal {...defaultProps} type="unknown" />);
            expect(container.querySelector('.btn-danger')).toBeInTheDocument();
        });

        it('should have secondary button for cancel', () => {
            const { container } = render(<ConfirmModal {...defaultProps} />);
            expect(container.querySelector('.btn-secondary')).toBeInTheDocument();
        });
    });

    describe('close functionality', () => {
        it('should call onCancel when close button is clicked', () => {
            const { container } = render(<ConfirmModal {...defaultProps} />);
            const closeButton = container.querySelector('.confirm-modal-close');
            fireEvent.click(closeButton);
            expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
        });

        it('should call onCancel when backdrop is clicked', () => {
            const { container } = render(<ConfirmModal {...defaultProps} />);
            const backdrop = container.querySelector('.confirm-modal-backdrop');
            fireEvent.click(backdrop);
            expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
        });
    });

    describe('structure', () => {
        it('should have proper modal structure', () => {
            const { container } = render(<ConfirmModal {...defaultProps} />);
            expect(container.querySelector('.confirm-modal')).toBeInTheDocument();
            expect(container.querySelector('.confirm-modal-backdrop')).toBeInTheDocument();
            expect(container.querySelector('.confirm-modal-header')).toBeInTheDocument();
            expect(container.querySelector('.confirm-modal-body')).toBeInTheDocument();
            expect(container.querySelector('.confirm-modal-footer')).toBeInTheDocument();
        });
    });
});
