import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PublicLinks from '../PublicLinks';

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

describe('PublicLinks', () => {
    const defaultProps = {
        activeSection: '',
        setActiveSection: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const renderWithRouter = (props = {}) => {
        return render(
            <MemoryRouter>
                <PublicLinks {...defaultProps} {...props} />
            </MemoryRouter>
        );
    };

    describe('basic rendering', () => {
        it('should render all three public links', () => {
            renderWithRouter();
            expect(screen.getByText('Leagues')).toBeInTheDocument();
            expect(screen.getByText('Rules')).toBeInTheDocument();
            expect(screen.getByText('Awards')).toBeInTheDocument();
        });

        it('should render exactly three links', () => {
            renderWithRouter();
            const links = screen.getAllByRole('link');
            expect(links).toHaveLength(3);
        });

        it('should render three nav-items', () => {
            const { container } = renderWithRouter();
            const navItems = container.querySelectorAll('.nav-item');
            expect(navItems).toHaveLength(3);
        });
    });

    describe('Leagues link', () => {
        it('should render Leagues link', () => {
            renderWithRouter();
            expect(screen.getByText('Leagues')).toBeInTheDocument();
        });

        it('should navigate to /leagues', () => {
            renderWithRouter();
            const link = screen.getByTestId('link-/leagues');
            expect(link).toHaveAttribute('href', '/leagues');
        });

        it('should have nav-link class', () => {
            renderWithRouter();
            const link = screen.getByText('Leagues');
            expect(link).toHaveClass('nav-link');
        });

        it('should call setActiveSection with leagues when clicked', () => {
            const setActiveSection = jest.fn();
            renderWithRouter({ setActiveSection });
            const link = screen.getByText('Leagues');
            fireEvent.click(link);
            expect(setActiveSection).toHaveBeenCalledWith('leagues');
        });

        it('should apply active class when activeSection is leagues', () => {
            renderWithRouter({ activeSection: 'leagues' });
            const link = screen.getByText('Leagues');
            expect(link).toHaveClass('active');
        });

        it('should not apply active class when activeSection is different', () => {
            renderWithRouter({ activeSection: 'rules' });
            const link = screen.getByText('Leagues');
            expect(link).not.toHaveClass('active');
        });
    });

    describe('Rules link', () => {
        it('should render Rules link', () => {
            renderWithRouter();
            expect(screen.getByText('Rules')).toBeInTheDocument();
        });

        it('should navigate to /rules', () => {
            renderWithRouter();
            const link = screen.getByTestId('link-/rules');
            expect(link).toHaveAttribute('href', '/rules');
        });

        it('should have nav-link class', () => {
            renderWithRouter();
            const link = screen.getByText('Rules');
            expect(link).toHaveClass('nav-link');
        });

        it('should call setActiveSection with rules when clicked', () => {
            const setActiveSection = jest.fn();
            renderWithRouter({ setActiveSection });
            const link = screen.getByText('Rules');
            fireEvent.click(link);
            expect(setActiveSection).toHaveBeenCalledWith('rules');
        });

        it('should apply active class when activeSection is rules', () => {
            renderWithRouter({ activeSection: 'rules' });
            const link = screen.getByText('Rules');
            expect(link).toHaveClass('active');
        });

        it('should not apply active class when activeSection is different', () => {
            renderWithRouter({ activeSection: 'leagues' });
            const link = screen.getByText('Rules');
            expect(link).not.toHaveClass('active');
        });
    });

    describe('Awards link', () => {
        it('should render Awards link', () => {
            renderWithRouter();
            expect(screen.getByText('Awards')).toBeInTheDocument();
        });

        it('should navigate to /awards', () => {
            renderWithRouter();
            const link = screen.getByTestId('link-/awards');
            expect(link).toHaveAttribute('href', '/awards');
        });

        it('should have nav-link class', () => {
            renderWithRouter();
            const link = screen.getByText('Awards');
            expect(link).toHaveClass('nav-link');
        });

        it('should call setActiveSection with awards when clicked', () => {
            const setActiveSection = jest.fn();
            renderWithRouter({ setActiveSection });
            const link = screen.getByText('Awards');
            fireEvent.click(link);
            expect(setActiveSection).toHaveBeenCalledWith('awards');
        });

        it('should apply active class when activeSection is awards', () => {
            renderWithRouter({ activeSection: 'awards' });
            const link = screen.getByText('Awards');
            expect(link).toHaveClass('active');
        });

        it('should not apply active class when activeSection is different', () => {
            renderWithRouter({ activeSection: 'leagues' });
            const link = screen.getByText('Awards');
            expect(link).not.toHaveClass('active');
        });
    });

    describe('active section handling', () => {
        it('should not have any active links when activeSection is empty', () => {
            renderWithRouter({ activeSection: '' });
            const links = screen.getAllByRole('link');
            links.forEach((link) => {
                expect(link).not.toHaveClass('active');
            });
        });

        it('should not have any active links when activeSection is undefined', () => {
            renderWithRouter({ activeSection: undefined });
            const links = screen.getAllByRole('link');
            links.forEach((link) => {
                expect(link.className).not.toContain('active');
            });
        });

        it('should not have any active links when activeSection is unrelated', () => {
            renderWithRouter({ activeSection: 'pods' });
            const links = screen.getAllByRole('link');
            links.forEach((link) => {
                expect(link).not.toHaveClass('active');
            });
        });

        it('should only have one active link at a time', () => {
            renderWithRouter({ activeSection: 'leagues' });
            const links = screen.getAllByRole('link');
            const activeLinks = links.filter((link) => link.classList.contains('active'));
            expect(activeLinks).toHaveLength(1);
        });
    });

    describe('setActiveSection callback', () => {
        it('should call setActiveSection once per click', () => {
            const setActiveSection = jest.fn();
            renderWithRouter({ setActiveSection });

            const leaguesLink = screen.getByText('Leagues');
            fireEvent.click(leaguesLink);

            expect(setActiveSection).toHaveBeenCalledTimes(1);
        });

        it('should call setActiveSection with correct value for each link', () => {
            const setActiveSection = jest.fn();
            renderWithRouter({ setActiveSection });

            fireEvent.click(screen.getByText('Leagues'));
            expect(setActiveSection).toHaveBeenLastCalledWith('leagues');

            fireEvent.click(screen.getByText('Rules'));
            expect(setActiveSection).toHaveBeenLastCalledWith('rules');

            fireEvent.click(screen.getByText('Awards'));
            expect(setActiveSection).toHaveBeenLastCalledWith('awards');

            expect(setActiveSection).toHaveBeenCalledTimes(3);
        });
    });

    describe('component structure', () => {
        it('should render as a React fragment (no wrapper element)', () => {
            const { container } = renderWithRouter();
            // Fragment renders children directly, so first child should be an li
            const firstChild = container.firstChild;
            expect(firstChild.tagName).toBe('LI');
        });

        it('should render list items in correct order', () => {
            renderWithRouter();
            const links = screen.getAllByRole('link');
            expect(links[0]).toHaveTextContent('Leagues');
            expect(links[1]).toHaveTextContent('Rules');
            expect(links[2]).toHaveTextContent('Awards');
        });

        it('should wrap each link in a nav-item list item', () => {
            renderWithRouter();
            const listItems = screen.getAllByRole('listitem');
            expect(listItems).toHaveLength(3);
            listItems.forEach((item) => {
                expect(item).toHaveClass('nav-item');
            });
        });
    });

    describe('accessibility', () => {
        it('should have accessible link text', () => {
            renderWithRouter();
            expect(screen.getByRole('link', { name: 'Leagues' })).toBeInTheDocument();
            expect(screen.getByRole('link', { name: 'Rules' })).toBeInTheDocument();
            expect(screen.getByRole('link', { name: 'Awards' })).toBeInTheDocument();
        });
    });

    describe('edge cases', () => {
        it('should handle multiple rapid clicks', () => {
            const setActiveSection = jest.fn();
            renderWithRouter({ setActiveSection });

            const link = screen.getByText('Leagues');
            fireEvent.click(link);
            fireEvent.click(link);
            fireEvent.click(link);

            expect(setActiveSection).toHaveBeenCalledTimes(3);
            expect(setActiveSection).toHaveBeenCalledWith('leagues');
        });

        it('should handle switching between links', () => {
            const setActiveSection = jest.fn();
            renderWithRouter({ setActiveSection });

            fireEvent.click(screen.getByText('Leagues'));
            fireEvent.click(screen.getByText('Rules'));
            fireEvent.click(screen.getByText('Awards'));
            fireEvent.click(screen.getByText('Leagues'));

            expect(setActiveSection).toHaveBeenCalledTimes(4);
        });
    });
});
