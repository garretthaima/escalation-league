import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LoadingButton from './LoadingButton';

describe('LoadingButton', () => {
    const defaultProps = {
        children: 'Submit',
        onClick: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('rendering', () => {
        it('should render button with children', () => {
            render(<LoadingButton {...defaultProps} />);
            expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
        });

        it('should render button with custom text', () => {
            render(<LoadingButton {...defaultProps}>Save Changes</LoadingButton>);
            expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
        });
    });

    describe('loading state', () => {
        it('should show spinner when loading', () => {
            const { container } = render(<LoadingButton {...defaultProps} loading={true} />);
            expect(container.querySelector('.spinner-border')).toBeInTheDocument();
        });

        it('should show loading text when loading', () => {
            render(<LoadingButton {...defaultProps} loading={true} />);
            expect(screen.getByText('Loading...')).toBeInTheDocument();
        });

        it('should show custom loading text', () => {
            render(<LoadingButton {...defaultProps} loading={true} loadingText="Saving..." />);
            expect(screen.getByText('Saving...')).toBeInTheDocument();
        });

        it('should not show children when loading', () => {
            render(<LoadingButton {...defaultProps} loading={true} />);
            expect(screen.queryByText('Submit')).not.toBeInTheDocument();
        });

        it('should be disabled when loading', () => {
            render(<LoadingButton {...defaultProps} loading={true} />);
            expect(screen.getByRole('button')).toBeDisabled();
        });

        it('should not show spinner when not loading', () => {
            const { container } = render(<LoadingButton {...defaultProps} loading={false} />);
            expect(container.querySelector('.spinner-border')).not.toBeInTheDocument();
        });
    });

    describe('icon', () => {
        it('should render icon when provided', () => {
            const { container } = render(<LoadingButton {...defaultProps} icon="fas fa-save" />);
            expect(container.querySelector('.fa-save')).toBeInTheDocument();
        });

        it('should not render icon when loading', () => {
            const { container } = render(<LoadingButton {...defaultProps} icon="fas fa-save" loading={true} />);
            expect(container.querySelector('.fa-save')).not.toBeInTheDocument();
        });

        it('should not render icon element when not provided', () => {
            const { container } = render(<LoadingButton {...defaultProps} />);
            const button = container.querySelector('button');
            expect(button.querySelector('i')).not.toBeInTheDocument();
        });
    });

    describe('variant', () => {
        it('should apply primary variant by default', () => {
            const { container } = render(<LoadingButton {...defaultProps} />);
            expect(container.querySelector('.btn-primary')).toBeInTheDocument();
        });

        it('should apply custom variant', () => {
            const { container } = render(<LoadingButton {...defaultProps} variant="success" />);
            expect(container.querySelector('.btn-success')).toBeInTheDocument();
        });

        it('should apply danger variant', () => {
            const { container } = render(<LoadingButton {...defaultProps} variant="danger" />);
            expect(container.querySelector('.btn-danger')).toBeInTheDocument();
        });
    });

    describe('disabled state', () => {
        it('should be disabled when disabled prop is true', () => {
            render(<LoadingButton {...defaultProps} disabled={true} />);
            expect(screen.getByRole('button')).toBeDisabled();
        });

        it('should not be disabled by default', () => {
            render(<LoadingButton {...defaultProps} />);
            expect(screen.getByRole('button')).not.toBeDisabled();
        });

        it('should be disabled when loading even if disabled is false', () => {
            render(<LoadingButton {...defaultProps} loading={true} disabled={false} />);
            expect(screen.getByRole('button')).toBeDisabled();
        });
    });

    describe('click handling', () => {
        it('should call onClick when clicked', () => {
            render(<LoadingButton {...defaultProps} />);
            fireEvent.click(screen.getByRole('button'));
            expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
        });

        it('should not call onClick when disabled', () => {
            render(<LoadingButton {...defaultProps} disabled={true} />);
            fireEvent.click(screen.getByRole('button'));
            expect(defaultProps.onClick).not.toHaveBeenCalled();
        });

        it('should not call onClick when loading', () => {
            render(<LoadingButton {...defaultProps} loading={true} />);
            fireEvent.click(screen.getByRole('button'));
            expect(defaultProps.onClick).not.toHaveBeenCalled();
        });
    });

    describe('type prop', () => {
        it('should be button type by default', () => {
            render(<LoadingButton {...defaultProps} />);
            expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
        });

        it('should be submit type when specified', () => {
            render(<LoadingButton {...defaultProps} type="submit" />);
            expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
        });

        it('should be reset type when specified', () => {
            render(<LoadingButton {...defaultProps} type="reset" />);
            expect(screen.getByRole('button')).toHaveAttribute('type', 'reset');
        });
    });

    describe('className prop', () => {
        it('should apply additional className', () => {
            const { container } = render(<LoadingButton {...defaultProps} className="custom-class" />);
            expect(container.querySelector('.custom-class')).toBeInTheDocument();
        });

        it('should preserve btn class with custom className', () => {
            const { container } = render(<LoadingButton {...defaultProps} className="custom-class" />);
            expect(container.querySelector('.btn')).toBeInTheDocument();
        });
    });

    describe('style prop', () => {
        it('should apply inline styles', () => {
            render(<LoadingButton {...defaultProps} style={{ width: '100%' }} />);
            expect(screen.getByRole('button')).toHaveStyle({ width: '100%' });
        });
    });

    describe('additional props', () => {
        it('should pass through additional props', () => {
            render(<LoadingButton {...defaultProps} data-testid="custom-button" aria-label="Custom" />);
            expect(screen.getByTestId('custom-button')).toBeInTheDocument();
            expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Custom');
        });
    });

    describe('spinner accessibility', () => {
        it('should have aria-hidden on spinner', () => {
            const { container } = render(<LoadingButton {...defaultProps} loading={true} />);
            const spinner = container.querySelector('.spinner-border');
            expect(spinner).toHaveAttribute('aria-hidden', 'true');
        });

        it('should have status role on spinner', () => {
            const { container } = render(<LoadingButton {...defaultProps} loading={true} />);
            const spinner = container.querySelector('[role="status"]');
            expect(spinner).toBeInTheDocument();
        });
    });
});
