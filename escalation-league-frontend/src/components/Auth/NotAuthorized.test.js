import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import NotAuthorized from './NotAuthorized';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('../../__mocks__/react-router-dom'),
    useNavigate: () => mockNavigate
}));

describe('NotAuthorized', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('rendering', () => {
        it('should render 403 error heading', () => {
            render(<NotAuthorized />);
            expect(screen.getByRole('heading', { name: /403 - Not Authorized/i })).toBeInTheDocument();
        });

        it('should render error message text', () => {
            render(<NotAuthorized />);
            expect(screen.getByText(/You do not have permission to access this page/i)).toBeInTheDocument();
        });

        it('should render Go to Home button', () => {
            render(<NotAuthorized />);
            expect(screen.getByRole('button', { name: /Go to Home/i })).toBeInTheDocument();
        });

        it('should have text-danger class on heading', () => {
            render(<NotAuthorized />);
            const heading = screen.getByRole('heading');
            expect(heading).toHaveClass('text-danger');
        });
    });

    describe('navigation', () => {
        it('should navigate to home when button clicked', () => {
            render(<NotAuthorized />);
            const button = screen.getByRole('button', { name: /Go to Home/i });

            fireEvent.click(button);

            expect(mockNavigate).toHaveBeenCalledWith('/');
        });

        it('should navigate to home only once per click', () => {
            render(<NotAuthorized />);
            const button = screen.getByRole('button', { name: /Go to Home/i });

            fireEvent.click(button);
            fireEvent.click(button);

            expect(mockNavigate).toHaveBeenCalledTimes(2);
        });
    });

    describe('styling', () => {
        it('should have container class', () => {
            const { container } = render(<NotAuthorized />);
            expect(container.querySelector('.container')).toBeInTheDocument();
        });

        it('should have text-center class for centering', () => {
            const { container } = render(<NotAuthorized />);
            expect(container.querySelector('.text-center')).toBeInTheDocument();
        });
    });
});
