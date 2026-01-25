import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Footer from './Footer';

// Mock fetch
global.fetch = jest.fn();

describe('Footer', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        fetch.mockRejectedValue(new Error('Not found')); // Default to no build info
    });

    describe('rendering', () => {
        it('should render footer element', () => {
            const { container } = render(<Footer />);
            expect(container.querySelector('.footer')).toBeInTheDocument();
        });

        it('should render copyright text', () => {
            render(<Footer />);
            expect(screen.getByText(/Escalation League 2025/)).toBeInTheDocument();
        });

        it('should render Rules link', () => {
            render(<Footer />);
            expect(screen.getByRole('link', { name: 'Rules' })).toBeInTheDocument();
            expect(screen.getByRole('link', { name: 'Rules' })).toHaveAttribute('href', '/rules');
        });

        it('should render Awards link', () => {
            render(<Footer />);
            expect(screen.getByRole('link', { name: 'Awards' })).toBeInTheDocument();
            expect(screen.getByRole('link', { name: 'Awards' })).toHaveAttribute('href', '/awards');
        });

        it('should render Contact Us link', () => {
            render(<Footer />);
            expect(screen.getByRole('link', { name: 'Contact Us' })).toBeInTheDocument();
            expect(screen.getByRole('link', { name: 'Contact Us' })).toHaveAttribute('href', '/contact');
        });
    });

    describe('build info', () => {
        it('should not show build info when fetch fails', async () => {
            fetch.mockRejectedValueOnce(new Error('Not found'));

            render(<Footer />);

            // Wait a tick for the effect to run
            await waitFor(() => {
                expect(screen.queryByText(/Build Id/)).not.toBeInTheDocument();
            });
        });

        it('should show build info when available', async () => {
            const mockBuildInfo = { gitCommit: 'abc123' };
            fetch.mockResolvedValueOnce({
                json: () => Promise.resolve(mockBuildInfo)
            });

            render(<Footer />);

            await waitFor(() => {
                expect(screen.getByText(/Build Id - abc123/)).toBeInTheDocument();
            });
        });

        it('should fetch build info on mount', async () => {
            render(<Footer />);

            expect(fetch).toHaveBeenCalledWith('/build-info.json');
        });
    });

    describe('structure', () => {
        it('should have container wrapper', () => {
            const { container } = render(<Footer />);
            expect(container.querySelector('.container')).toBeInTheDocument();
        });

        it('should have navigation list', () => {
            render(<Footer />);
            expect(screen.getByRole('list')).toBeInTheDocument();
        });

        it('should have 3 navigation links', () => {
            render(<Footer />);
            const links = screen.getAllByRole('link');
            expect(links).toHaveLength(3);
        });
    });
});
