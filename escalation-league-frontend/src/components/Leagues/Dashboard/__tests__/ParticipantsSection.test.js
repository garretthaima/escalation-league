import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ParticipantsSection from '../ParticipantsSection';

// Wrapper component with Router
const renderWithRouter = (component) => {
    return render(
        <BrowserRouter>
            {component}
        </BrowserRouter>
    );
};

describe('ParticipantsSection', () => {
    const mockParticipants = [
        {
            user_id: 1,
            firstname: 'John',
            lastname: 'Doe',
            current_commander: 'Atraxa, Praetors\' Voice',
            total_points: 100,
            league_wins: 10,
            league_losses: 5
        },
        {
            user_id: 2,
            firstname: 'Jane',
            lastname: 'Smith',
            current_commander: 'Korvold, Fae-Cursed King',
            total_points: 90,
            league_wins: 8,
            league_losses: 6
        },
        {
            user_id: 3,
            firstname: 'Bob',
            lastname: 'Johnson',
            current_commander: null,
            total_points: 80,
            league_wins: 7,
            league_losses: 7
        }
    ];

    const defaultProps = {
        participants: mockParticipants,
        leagueId: 1
    };

    describe('rendering', () => {
        it('should render all participants', () => {
            renderWithRouter(<ParticipantsSection {...defaultProps} />);
            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText('Jane Smith')).toBeInTheDocument();
            expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
        });

        it('should display commander name for each participant', () => {
            renderWithRouter(<ParticipantsSection {...defaultProps} />);
            expect(screen.getByText('Atraxa, Praetors\' Voice')).toBeInTheDocument();
            expect(screen.getByText('Korvold, Fae-Cursed King')).toBeInTheDocument();
        });

        it('should display "No commander" when commander is null', () => {
            renderWithRouter(<ParticipantsSection {...defaultProps} />);
            expect(screen.getByText('No commander')).toBeInTheDocument();
        });

        it('should display total points badge', () => {
            renderWithRouter(<ParticipantsSection {...defaultProps} />);
            expect(screen.getByText('100')).toBeInTheDocument();
            expect(screen.getByText('90')).toBeInTheDocument();
            expect(screen.getByText('80')).toBeInTheDocument();
        });

        it('should display win-loss record', () => {
            renderWithRouter(<ParticipantsSection {...defaultProps} />);
            expect(screen.getByText('10W-5L')).toBeInTheDocument();
            expect(screen.getByText('8W-6L')).toBeInTheDocument();
            expect(screen.getByText('7W-7L')).toBeInTheDocument();
        });
    });

    describe('empty state', () => {
        it('should render empty message when participants is empty', () => {
            renderWithRouter(<ParticipantsSection {...defaultProps} participants={[]} />);
            expect(screen.getByText('No participants in this league yet.')).toBeInTheDocument();
        });

        it('should render empty message when participants is null', () => {
            renderWithRouter(<ParticipantsSection {...defaultProps} participants={null} />);
            expect(screen.getByText('No participants in this league yet.')).toBeInTheDocument();
        });

        it('should render empty message when participants is undefined', () => {
            renderWithRouter(<ParticipantsSection {...defaultProps} participants={undefined} />);
            expect(screen.getByText('No participants in this league yet.')).toBeInTheDocument();
        });
    });

    describe('avatar initials', () => {
        it('should display user initials in avatar', () => {
            renderWithRouter(<ParticipantsSection {...defaultProps} />);
            expect(screen.getByText('JD')).toBeInTheDocument();
            expect(screen.getByText('JS')).toBeInTheDocument();
            expect(screen.getByText('BJ')).toBeInTheDocument();
        });

        it('should handle missing first or last name gracefully', () => {
            const participantsWithMissingNames = [
                {
                    user_id: 1,
                    firstname: 'John',
                    lastname: undefined,
                    current_commander: 'Test Commander',
                    total_points: 50
                }
            ];
            renderWithRouter(<ParticipantsSection {...defaultProps} participants={participantsWithMissingNames} />);
            expect(screen.getByText('J')).toBeInTheDocument();
        });
    });

    describe('profile links', () => {
        it('should link to participant profile page', () => {
            renderWithRouter(<ParticipantsSection {...defaultProps} />);
            const johnLink = screen.getByRole('link', { name: /John Doe/i });
            expect(johnLink).toHaveAttribute('href', '/leagues/1/profile/1');
        });

        it('should link each participant to their profile', () => {
            renderWithRouter(<ParticipantsSection {...defaultProps} />);
            const links = screen.getAllByRole('link');
            expect(links).toHaveLength(3);
            expect(links[0]).toHaveAttribute('href', '/leagues/1/profile/1');
            expect(links[1]).toHaveAttribute('href', '/leagues/1/profile/2');
            expect(links[2]).toHaveAttribute('href', '/leagues/1/profile/3');
        });
    });

    describe('search functionality', () => {
        const manyParticipants = Array.from({ length: 15 }, (_, i) => ({
            user_id: i + 1,
            firstname: `Player${i + 1}`,
            lastname: 'Test',
            current_commander: i % 2 === 0 ? 'Atraxa' : 'Korvold',
            total_points: 100 - i * 5,
            league_wins: 10 - i,
            league_losses: i
        }));

        it('should show search input when more than 10 participants', () => {
            renderWithRouter(<ParticipantsSection {...defaultProps} participants={manyParticipants} />);
            expect(screen.getByPlaceholderText('Search by name or commander...')).toBeInTheDocument();
        });

        it('should not show search input with 10 or fewer participants', () => {
            renderWithRouter(<ParticipantsSection {...defaultProps} />);
            expect(screen.queryByPlaceholderText('Search by name or commander...')).not.toBeInTheDocument();
        });

        it('should filter participants by name', () => {
            renderWithRouter(<ParticipantsSection {...defaultProps} participants={manyParticipants} />);
            const searchInput = screen.getByPlaceholderText('Search by name or commander...');

            fireEvent.change(searchInput, { target: { value: 'Player1 ' } });

            // Should show Player1, Player10-15
            expect(screen.getByText('Player1 Test')).toBeInTheDocument();
            expect(screen.queryByText('Player2 Test')).not.toBeInTheDocument();
        });

        it('should filter participants by commander name', () => {
            renderWithRouter(<ParticipantsSection {...defaultProps} participants={manyParticipants} />);
            const searchInput = screen.getByPlaceholderText('Search by name or commander...');

            fireEvent.change(searchInput, { target: { value: 'Atraxa' } });

            // Should show only participants with Atraxa as commander (even indices)
            expect(screen.getByText('Player1 Test')).toBeInTheDocument();
            expect(screen.getByText('Player3 Test')).toBeInTheDocument();
            expect(screen.queryByText('Player2 Test')).not.toBeInTheDocument();
        });

        it('should be case insensitive in search', () => {
            renderWithRouter(<ParticipantsSection {...defaultProps} participants={manyParticipants} />);
            const searchInput = screen.getByPlaceholderText('Search by name or commander...');

            fireEvent.change(searchInput, { target: { value: 'ATRAXA' } });

            expect(screen.getByText('Player1 Test')).toBeInTheDocument();
        });

        it('should show "no match" message when search yields no results', () => {
            renderWithRouter(<ParticipantsSection {...defaultProps} participants={manyParticipants} />);
            const searchInput = screen.getByPlaceholderText('Search by name or commander...');

            fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

            expect(screen.getByText(/No participants match "nonexistent"/)).toBeInTheDocument();
        });

        it('should clear search results when search term is cleared', () => {
            renderWithRouter(<ParticipantsSection {...defaultProps} participants={manyParticipants} />);
            const searchInput = screen.getByPlaceholderText('Search by name or commander...');

            // Search for something
            fireEvent.change(searchInput, { target: { value: 'Player1 ' } });
            expect(screen.queryByText('Player2 Test')).not.toBeInTheDocument();

            // Clear search
            fireEvent.change(searchInput, { target: { value: '' } });
            expect(screen.getByText('Player2 Test')).toBeInTheDocument();
        });
    });

    describe('missing data handling', () => {
        it('should show 0 points when total_points is missing', () => {
            const participantNoPoints = [{
                user_id: 1,
                firstname: 'Test',
                lastname: 'User',
                current_commander: 'Commander',
                total_points: undefined,
                league_wins: 5,
                league_losses: 3
            }];
            renderWithRouter(<ParticipantsSection {...defaultProps} participants={participantNoPoints} />);
            expect(screen.getByText('0')).toBeInTheDocument();
        });

        it('should show 0W-0L when wins and losses are missing', () => {
            const participantNoRecord = [{
                user_id: 1,
                firstname: 'Test',
                lastname: 'User',
                current_commander: 'Commander',
                total_points: 50,
                league_wins: undefined,
                league_losses: undefined
            }];
            renderWithRouter(<ParticipantsSection {...defaultProps} participants={participantNoRecord} />);
            expect(screen.getByText('0W-0L')).toBeInTheDocument();
        });
    });

    describe('grid layout', () => {
        it('should have row class for grid layout', () => {
            const { container } = renderWithRouter(<ParticipantsSection {...defaultProps} />);
            expect(container.querySelector('.row.g-2')).toBeInTheDocument();
        });

        it('should have responsive column classes on participant cards', () => {
            const { container } = renderWithRouter(<ParticipantsSection {...defaultProps} />);
            const participantCards = container.querySelectorAll('.col-md-6.col-lg-4');
            expect(participantCards.length).toBe(3);
        });
    });

    describe('styling', () => {
        it('should have badge with bg-primary class for points', () => {
            const { container } = renderWithRouter(<ParticipantsSection {...defaultProps} />);
            const badges = container.querySelectorAll('.badge.bg-primary');
            expect(badges.length).toBe(3);
        });

        it('should have rounded-circle class on avatar', () => {
            const { container } = renderWithRouter(<ParticipantsSection {...defaultProps} />);
            const avatars = container.querySelectorAll('.rounded-circle');
            expect(avatars.length).toBe(3);
        });

        it('should have text-decoration-none on links', () => {
            renderWithRouter(<ParticipantsSection {...defaultProps} />);
            const links = screen.getAllByRole('link');
            links.forEach(link => {
                expect(link).toHaveClass('text-decoration-none');
            });
        });
    });

    describe('commander display edge cases', () => {
        it('should handle empty string commander', () => {
            const participantEmptyCommander = [{
                user_id: 1,
                firstname: 'Test',
                lastname: 'User',
                current_commander: '',
                total_points: 50,
                league_wins: 5,
                league_losses: 3
            }];
            renderWithRouter(<ParticipantsSection {...defaultProps} participants={participantEmptyCommander} />);
            expect(screen.getByText('No commander')).toBeInTheDocument();
        });
    });
});
