import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminLinks from '../AdminLinks';

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

describe('AdminLinks', () => {
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
                <AdminLinks {...defaultProps} {...props} />
            </MemoryRouter>
        );
    };

    describe('basic rendering', () => {
        it('should render Admin dropdown menu', () => {
            renderWithRouter();
            expect(screen.getByText('Admin')).toBeInTheDocument();
        });

        it('should render dropdown toggle button', () => {
            renderWithRouter();
            const toggle = screen.getByRole('button', { name: /admin/i });
            expect(toggle).toBeInTheDocument();
            expect(toggle).toHaveAttribute('data-bs-toggle', 'dropdown');
        });

        it('should have correct aria attributes', () => {
            renderWithRouter();
            const toggle = screen.getByRole('button', { name: /admin/i });
            expect(toggle).toHaveAttribute('aria-expanded', 'false');
            expect(toggle).toHaveAttribute('id', 'adminDropdown');
        });

        it('should render dropdown menu with correct aria-labelledby', () => {
            renderWithRouter();
            const menu = screen.getByRole('list');
            expect(menu).toHaveAttribute('aria-labelledby', 'adminDropdown');
            expect(menu).toHaveClass('dropdown-menu');
        });
    });

    describe('League Management link visibility', () => {
        it('should show League Management link when user has league_manage_requests permission', () => {
            renderWithRouter({
                permissions: [{ name: 'league_manage_requests' }],
            });
            expect(screen.getByText('League Management')).toBeInTheDocument();
        });

        it('should not show League Management link when user lacks permission', () => {
            renderWithRouter({
                permissions: [],
            });
            expect(screen.queryByText('League Management')).not.toBeInTheDocument();
        });

        it('should navigate to /admin/leagues when League Management is clicked', () => {
            renderWithRouter({
                permissions: [{ name: 'league_manage_requests' }],
            });
            const link = screen.getByTestId('link-/admin/leagues');
            expect(link).toHaveAttribute('href', '/admin/leagues');
        });

        it('should call setActiveSection with adminLeagues when League Management is clicked', () => {
            const setActiveSection = jest.fn();
            renderWithRouter({
                permissions: [{ name: 'league_manage_requests' }],
                setActiveSection,
            });
            const link = screen.getByTestId('link-/admin/leagues');
            fireEvent.click(link);
            expect(setActiveSection).toHaveBeenCalledWith('adminLeagues');
        });
    });

    describe('Pods link visibility', () => {
        it('should show Pods link when user has pod_read permission', () => {
            renderWithRouter({
                permissions: [{ name: 'pod_read' }],
            });
            expect(screen.getByText('Pods')).toBeInTheDocument();
        });

        it('should not show Pods link when user lacks permission', () => {
            renderWithRouter({
                permissions: [],
            });
            expect(screen.queryByText('Pods')).not.toBeInTheDocument();
        });

        it('should navigate to /admin/pods when Pods is clicked', () => {
            renderWithRouter({
                permissions: [{ name: 'pod_read' }],
            });
            const link = screen.getByTestId('link-/admin/pods');
            expect(link).toHaveAttribute('href', '/admin/pods');
        });

        it('should call setActiveSection with adminPods when Pods is clicked', () => {
            const setActiveSection = jest.fn();
            renderWithRouter({
                permissions: [{ name: 'pod_read' }],
                setActiveSection,
            });
            const link = screen.getByTestId('link-/admin/pods');
            fireEvent.click(link);
            expect(setActiveSection).toHaveBeenCalledWith('adminPods');
        });
    });

    describe('Attendance link visibility', () => {
        it('should show Attendance link when user has admin_attendance_manage permission', () => {
            renderWithRouter({
                permissions: [{ name: 'admin_attendance_manage' }],
            });
            expect(screen.getByText('Attendance')).toBeInTheDocument();
        });

        it('should show Attendance link when user has admin_discord_poll permission', () => {
            renderWithRouter({
                permissions: [{ name: 'admin_discord_poll' }],
            });
            expect(screen.getByText('Attendance')).toBeInTheDocument();
        });

        it('should show Attendance link when user has both attendance permissions', () => {
            renderWithRouter({
                permissions: [
                    { name: 'admin_attendance_manage' },
                    { name: 'admin_discord_poll' },
                ],
            });
            expect(screen.getByText('Attendance')).toBeInTheDocument();
        });

        it('should not show Attendance link when user lacks permission', () => {
            renderWithRouter({
                permissions: [],
            });
            expect(screen.queryByText('Attendance')).not.toBeInTheDocument();
        });

        it('should navigate to /admin/attendance when Attendance is clicked', () => {
            renderWithRouter({
                permissions: [{ name: 'admin_attendance_manage' }],
            });
            const link = screen.getByTestId('link-/admin/attendance');
            expect(link).toHaveAttribute('href', '/admin/attendance');
        });

        it('should call setActiveSection with adminAttendance when Attendance is clicked', () => {
            const setActiveSection = jest.fn();
            renderWithRouter({
                permissions: [{ name: 'admin_attendance_manage' }],
                setActiveSection,
            });
            const link = screen.getByTestId('link-/admin/attendance');
            fireEvent.click(link);
            expect(setActiveSection).toHaveBeenCalledWith('adminAttendance');
        });
    });

    describe('multiple permissions', () => {
        it('should show all links when user has all permissions', () => {
            renderWithRouter({
                permissions: [
                    { name: 'league_manage_requests' },
                    { name: 'pod_read' },
                    { name: 'admin_attendance_manage' },
                ],
            });
            expect(screen.getByText('League Management')).toBeInTheDocument();
            expect(screen.getByText('Pods')).toBeInTheDocument();
            expect(screen.getByText('Attendance')).toBeInTheDocument();
        });

        it('should show only links for granted permissions', () => {
            renderWithRouter({
                permissions: [{ name: 'pod_read' }],
            });
            expect(screen.queryByText('League Management')).not.toBeInTheDocument();
            expect(screen.getByText('Pods')).toBeInTheDocument();
            expect(screen.queryByText('Attendance')).not.toBeInTheDocument();
        });

        it('should handle permissions array with unrelated permissions', () => {
            renderWithRouter({
                permissions: [
                    { name: 'unrelated_permission' },
                    { name: 'another_permission' },
                ],
            });
            expect(screen.queryByText('League Management')).not.toBeInTheDocument();
            expect(screen.queryByText('Pods')).not.toBeInTheDocument();
            expect(screen.queryByText('Attendance')).not.toBeInTheDocument();
        });
    });

    describe('dropdown item styling', () => {
        it('should apply dropdown-item class to all links', () => {
            renderWithRouter({
                permissions: [
                    { name: 'league_manage_requests' },
                    { name: 'pod_read' },
                    { name: 'admin_attendance_manage' },
                ],
            });
            const links = screen.getAllByRole('link');
            links.forEach((link) => {
                expect(link).toHaveClass('dropdown-item');
            });
        });
    });
});
