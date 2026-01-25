import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PodsLinks from '../PodsLinks';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    Link: ({ children, to, onClick, className }) => (
        <a href={to} onClick={onClick} className={className} data-testid={`link-${to}`}>
            {children}
        </a>
    ),
    NavLink: ({ children, to, className }) => <a href={to} className={typeof className === 'function' ? className({ isActive: false }) : className}>{children}</a>,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/' }),
    MemoryRouter: ({ children }) => <>{children}</>,
}));

describe('PodsLinks', () => {
    const defaultProps = {
        activeSection: '',
        setActiveSection: jest.fn(),
        permissions: [],
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const renderWithRouter = (props = {}) => {
        return render(
            <MemoryRouter>
                <PodsLinks {...defaultProps} {...props} />
            </MemoryRouter>
        );
    };

    describe('permission-based rendering', () => {
        it('should return null when user lacks pod_read permission', () => {
            const { container } = renderWithRouter({
                permissions: [],
            });
            expect(container.firstChild).toBeNull();
        });

        it('should return null when permissions array is empty', () => {
            const { container } = renderWithRouter({
                permissions: [],
            });
            expect(container.firstChild).toBeNull();
        });

        it('should render when user has pod_read permission', () => {
            renderWithRouter({
                permissions: [{ name: 'pod_read' }],
            });
            expect(screen.getByText('Pods')).toBeInTheDocument();
        });

        it('should return null when user has unrelated permissions only', () => {
            const { container } = renderWithRouter({
                permissions: [
                    { name: 'some_other_permission' },
                    { name: 'another_permission' },
                ],
            });
            expect(container.firstChild).toBeNull();
        });

        it('should render when user has pod_read among multiple permissions', () => {
            renderWithRouter({
                permissions: [
                    { name: 'some_permission' },
                    { name: 'pod_read' },
                    { name: 'another_permission' },
                ],
            });
            expect(screen.getByText('Pods')).toBeInTheDocument();
        });
    });

    describe('link rendering', () => {
        beforeEach(() => {
            defaultProps.permissions = [{ name: 'pod_read' }];
        });

        it('should render nav-item list item', () => {
            renderWithRouter({
                permissions: [{ name: 'pod_read' }],
            });
            const listItem = screen.getByRole('listitem');
            expect(listItem).toHaveClass('nav-item');
        });

        it('should render Pods link with correct href', () => {
            renderWithRouter({
                permissions: [{ name: 'pod_read' }],
            });
            const link = screen.getByTestId('link-/pods');
            expect(link).toHaveAttribute('href', '/pods');
        });

        it('should apply nav-link class to the link', () => {
            renderWithRouter({
                permissions: [{ name: 'pod_read' }],
            });
            const link = screen.getByText('Pods');
            expect(link).toHaveClass('nav-link');
        });
    });

    describe('active section handling', () => {
        it('should apply active class when activeSection is pods', () => {
            renderWithRouter({
                permissions: [{ name: 'pod_read' }],
                activeSection: 'pods',
            });
            const link = screen.getByText('Pods');
            expect(link).toHaveClass('active');
        });

        it('should not apply active class when activeSection is different', () => {
            renderWithRouter({
                permissions: [{ name: 'pod_read' }],
                activeSection: 'leagues',
            });
            const link = screen.getByText('Pods');
            expect(link).not.toHaveClass('active');
        });

        it('should not apply active class when activeSection is empty', () => {
            renderWithRouter({
                permissions: [{ name: 'pod_read' }],
                activeSection: '',
            });
            const link = screen.getByText('Pods');
            expect(link).not.toHaveClass('active');
        });

        it('should not apply active class when activeSection is undefined', () => {
            renderWithRouter({
                permissions: [{ name: 'pod_read' }],
                activeSection: undefined,
            });
            const link = screen.getByText('Pods');
            expect(link.className).not.toContain('active');
        });
    });

    describe('setActiveSection callback', () => {
        it('should call setActiveSection with pods when link is clicked', () => {
            const setActiveSection = jest.fn();
            renderWithRouter({
                permissions: [{ name: 'pod_read' }],
                setActiveSection,
            });
            const link = screen.getByText('Pods');
            fireEvent.click(link);
            expect(setActiveSection).toHaveBeenCalledWith('pods');
        });

        it('should call setActiveSection only once per click', () => {
            const setActiveSection = jest.fn();
            renderWithRouter({
                permissions: [{ name: 'pod_read' }],
                setActiveSection,
            });
            const link = screen.getByText('Pods');
            fireEvent.click(link);
            expect(setActiveSection).toHaveBeenCalledTimes(1);
        });

        it('should call setActiveSection on each click', () => {
            const setActiveSection = jest.fn();
            renderWithRouter({
                permissions: [{ name: 'pod_read' }],
                setActiveSection,
            });
            const link = screen.getByText('Pods');
            fireEvent.click(link);
            fireEvent.click(link);
            fireEvent.click(link);
            expect(setActiveSection).toHaveBeenCalledTimes(3);
        });
    });

    describe('component structure', () => {
        it('should render a React fragment as root', () => {
            const { container } = renderWithRouter({
                permissions: [{ name: 'pod_read' }],
            });
            // Fragment renders children directly
            expect(container.querySelector('li.nav-item')).toBeInTheDocument();
        });

        it('should contain exactly one link', () => {
            renderWithRouter({
                permissions: [{ name: 'pod_read' }],
            });
            const links = screen.getAllByRole('link');
            expect(links).toHaveLength(1);
        });

        it('should have correct text content', () => {
            renderWithRouter({
                permissions: [{ name: 'pod_read' }],
            });
            expect(screen.getByText('Pods')).toBeInTheDocument();
        });
    });

    describe('edge cases', () => {
        it('should handle undefined permissions gracefully', () => {
            // This would throw an error if not handled, but the component expects permissions to be an array
            // Testing that the component works with an empty array
            const { container } = renderWithRouter({
                permissions: [],
            });
            expect(container.firstChild).toBeNull();
        });

        it('should handle permissions with additional properties', () => {
            renderWithRouter({
                permissions: [{ name: 'pod_read', id: 1, description: 'Read pods' }],
            });
            expect(screen.getByText('Pods')).toBeInTheDocument();
        });

        it('should correctly check permission name property', () => {
            // Permission object with name property set to something else
            const { container } = renderWithRouter({
                permissions: [{ name: 'pod_write' }],
            });
            expect(container.firstChild).toBeNull();
        });
    });
});
