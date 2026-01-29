import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminPage from '../AdminPage';

// Wrapper component with router
const renderWithRouter = (component) => {
    return render(
        <BrowserRouter>
            {component}
        </BrowserRouter>
    );
};

describe('AdminPage', () => {
    describe('Rendering', () => {
        it('should render the admin dashboard heading', () => {
            renderWithRouter(<AdminPage />);
            expect(screen.getByRole('heading', { name: /admin dashboard/i })).toBeInTheDocument();
        });

        it('should render welcome message', () => {
            renderWithRouter(<AdminPage />);
            expect(screen.getByText(/welcome to the admin dashboard/i)).toBeInTheDocument();
        });

        it('should render navigation links list', () => {
            renderWithRouter(<AdminPage />);
            expect(screen.getByRole('list')).toBeInTheDocument();
        });
    });

    describe('Navigation Links', () => {
        it('should render League Management link', () => {
            renderWithRouter(<AdminPage />);
            const link = screen.getByRole('link', { name: /league management/i });
            expect(link).toBeInTheDocument();
            expect(link).toHaveAttribute('href', '/admin/leagues');
        });

        it('should render Pods link', () => {
            renderWithRouter(<AdminPage />);
            const link = screen.getByRole('link', { name: /pods/i });
            expect(link).toBeInTheDocument();
            expect(link).toHaveAttribute('href', '/admin/pods');
        });

        it('should render User Role Management link', () => {
            renderWithRouter(<AdminPage />);
            const link = screen.getByRole('link', { name: /user role management/i });
            expect(link).toBeInTheDocument();
            expect(link).toHaveAttribute('href', '/admin/users');
        });

        it('should render Activity Logs link', () => {
            renderWithRouter(<AdminPage />);
            const link = screen.getByRole('link', { name: /activity logs/i });
            expect(link).toBeInTheDocument();
            expect(link).toHaveAttribute('href', '/admin/activity-logs');
        });

        it('should render exactly 4 navigation links', () => {
            renderWithRouter(<AdminPage />);
            const links = screen.getAllByRole('link');
            expect(links).toHaveLength(4);
        });
    });

    describe('Container Structure', () => {
        it('should have container with mt-4 class', () => {
            const { container } = renderWithRouter(<AdminPage />);
            expect(container.querySelector('.container.mt-4')).toBeInTheDocument();
        });

        it('should render list items for each link', () => {
            renderWithRouter(<AdminPage />);
            const listItems = screen.getAllByRole('listitem');
            expect(listItems).toHaveLength(4);
        });
    });
});
