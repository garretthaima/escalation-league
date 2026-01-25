import React from 'react';
import { render, screen } from '@testing-library/react';
import StatusBadge from './StatusBadge';

describe('StatusBadge', () => {
    describe('status mapping', () => {
        it('should apply success variant for "open" status', () => {
            const { container } = render(<StatusBadge status="open" />);
            expect(container.querySelector('.bg-success')).toBeInTheDocument();
        });

        it('should apply warning variant for "active" status', () => {
            const { container } = render(<StatusBadge status="active" />);
            expect(container.querySelector('.bg-warning')).toBeInTheDocument();
        });

        it('should apply info variant for "pending" status', () => {
            const { container } = render(<StatusBadge status="pending" />);
            expect(container.querySelector('.bg-info')).toBeInTheDocument();
        });

        it('should apply secondary variant for "complete" status', () => {
            const { container } = render(<StatusBadge status="complete" />);
            expect(container.querySelector('.bg-secondary')).toBeInTheDocument();
        });

        it('should apply secondary variant for "completed" status', () => {
            const { container } = render(<StatusBadge status="completed" />);
            expect(container.querySelector('.bg-secondary')).toBeInTheDocument();
        });
    });

    describe('result mapping', () => {
        it('should apply success variant for "win" result', () => {
            const { container } = render(<StatusBadge status="win" />);
            expect(container.querySelector('.bg-success')).toBeInTheDocument();
        });

        it('should apply danger variant for "loss" result', () => {
            const { container } = render(<StatusBadge status="loss" />);
            expect(container.querySelector('.bg-danger')).toBeInTheDocument();
        });

        it('should apply warning variant for "draw" result', () => {
            const { container } = render(<StatusBadge status="draw" />);
            expect(container.querySelector('.bg-warning')).toBeInTheDocument();
        });

        it('should apply danger variant for "disqualified" result', () => {
            const { container } = render(<StatusBadge status="disqualified" />);
            expect(container.querySelector('.bg-danger')).toBeInTheDocument();
        });
    });

    describe('generic statuses', () => {
        it('should apply success variant for "success" status', () => {
            const { container } = render(<StatusBadge status="success" />);
            expect(container.querySelector('.bg-success')).toBeInTheDocument();
        });

        it('should apply danger variant for "error" status', () => {
            const { container } = render(<StatusBadge status="error" />);
            expect(container.querySelector('.bg-danger')).toBeInTheDocument();
        });

        it('should apply warning variant for "warning" status', () => {
            const { container } = render(<StatusBadge status="warning" />);
            expect(container.querySelector('.bg-warning')).toBeInTheDocument();
        });

        it('should apply info variant for "info" status', () => {
            const { container } = render(<StatusBadge status="info" />);
            expect(container.querySelector('.bg-info')).toBeInTheDocument();
        });
    });

    describe('unknown status', () => {
        it('should apply secondary variant for unknown status', () => {
            const { container } = render(<StatusBadge status="unknown" />);
            expect(container.querySelector('.bg-secondary')).toBeInTheDocument();
        });

        it('should display the unknown status text', () => {
            render(<StatusBadge status="custom-status" />);
            expect(screen.getByText('custom-status')).toBeInTheDocument();
        });
    });

    describe('case insensitivity', () => {
        it('should handle uppercase status', () => {
            const { container } = render(<StatusBadge status="WIN" />);
            expect(container.querySelector('.bg-success')).toBeInTheDocument();
        });

        it('should handle mixed case status', () => {
            const { container } = render(<StatusBadge status="Active" />);
            expect(container.querySelector('.bg-warning')).toBeInTheDocument();
        });
    });

    describe('variant override', () => {
        it('should use explicit variant over status mapping', () => {
            const { container } = render(<StatusBadge status="win" variant="danger" />);
            expect(container.querySelector('.bg-danger')).toBeInTheDocument();
            expect(container.querySelector('.bg-success')).not.toBeInTheDocument();
        });

        it('should accept all Bootstrap variant types', () => {
            const variants = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark'];
            variants.forEach(variant => {
                const { container } = render(<StatusBadge status="test" variant={variant} />);
                expect(container.querySelector(`.bg-${variant}`)).toBeInTheDocument();
            });
        });
    });

    describe('text display', () => {
        it('should display status as text by default', () => {
            render(<StatusBadge status="pending" />);
            expect(screen.getByText('pending')).toBeInTheDocument();
        });

        it('should display children instead of status when provided', () => {
            render(<StatusBadge status="pending">Custom Text</StatusBadge>);
            expect(screen.getByText('Custom Text')).toBeInTheDocument();
            expect(screen.queryByText('pending')).not.toBeInTheDocument();
        });

        it('should handle complex children', () => {
            render(
                <StatusBadge status="active">
                    <span>Icon</span> Active
                </StatusBadge>
            );
            expect(screen.getByText('Icon')).toBeInTheDocument();
            expect(screen.getByText(/Active/)).toBeInTheDocument();
        });
    });

    describe('className prop', () => {
        it('should apply additional className', () => {
            const { container } = render(<StatusBadge status="open" className="extra-class" />);
            expect(container.querySelector('.extra-class')).toBeInTheDocument();
        });

        it('should preserve badge class with custom className', () => {
            const { container } = render(<StatusBadge status="open" className="extra-class" />);
            expect(container.querySelector('.badge')).toBeInTheDocument();
        });
    });

    describe('style prop', () => {
        it('should apply inline styles', () => {
            const { container } = render(
                <StatusBadge status="open" style={{ fontSize: '14px' }} />
            );
            const badge = container.querySelector('.badge');
            expect(badge).toHaveStyle({ fontSize: '14px' });
        });
    });

    describe('null/undefined handling', () => {
        it('should handle null status gracefully', () => {
            const { container } = render(<StatusBadge status={null} />);
            expect(container.querySelector('.badge')).toBeInTheDocument();
            expect(container.querySelector('.bg-secondary')).toBeInTheDocument();
        });

        it('should handle undefined status gracefully', () => {
            const { container } = render(<StatusBadge status={undefined} />);
            expect(container.querySelector('.badge')).toBeInTheDocument();
        });
    });
});
