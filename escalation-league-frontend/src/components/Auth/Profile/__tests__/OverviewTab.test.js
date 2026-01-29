// Mock axios BEFORE any imports (ESM compatibility)
jest.mock('../../../../api/axiosConfig', () => ({
    __esModule: true,
    default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

// Mock CommanderDisplay
jest.mock('../CommanderDisplay', () => {
    return function MockCommanderDisplay({ commanderId, showPartner }) {
        return <span data-testid="commander-display">{commanderId}</span>;
    };
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OverviewTab from '../OverviewTab';

const renderWithRouter = (component) => {
    return render(
        <MemoryRouter>
            {component}
        </MemoryRouter>
    );
};

describe('OverviewTab', () => {
    const mockUser = {
        firstname: 'John',
        lastname: 'Doe',
        email: 'john@example.com',
        last_login: '2024-06-15T10:30:00.000Z'
    };

    const mockCurrentLeague = {
        league_id: 1,
        name: 'Test League',
        is_active: true,
        league_wins: 10,
        league_losses: 5,
        league_draws: 2,
        rank: 3,
        current_commander: 'abc12345-1234-5678-abcd-123456789abc',
        commander_name: 'Kenrith, the Returned King',
        commander_partner: null,
        partner_name: null,
        commander_scryfall_id: 'abc12345',
        decklistUrl: 'https://moxfield.com/decks/test123'
    };

    describe('quick actions with league', () => {
        it('should display View Games link when in a league', () => {
            renderWithRouter(<OverviewTab user={mockUser} currentLeague={mockCurrentLeague} />);

            const gamesLink = screen.getByRole('link', { name: /View Games/i });
            expect(gamesLink).toBeInTheDocument();
            expect(gamesLink).toHaveAttribute('href', '/pods');
        });

        it('should display League Dashboard link when in a league', () => {
            renderWithRouter(<OverviewTab user={mockUser} currentLeague={mockCurrentLeague} />);

            const dashboardLink = screen.getByRole('link', { name: /League Dashboard/i });
            expect(dashboardLink).toBeInTheDocument();
            expect(dashboardLink).toHaveAttribute('href', '/leagues');
        });

        it('should display quick action descriptions', () => {
            renderWithRouter(<OverviewTab user={mockUser} currentLeague={mockCurrentLeague} />);

            expect(screen.getByText('Check active & pending pods')).toBeInTheDocument();
            expect(screen.getByText('View standings & schedule')).toBeInTheDocument();
        });
    });

    describe('quick actions without league', () => {
        it('should display Join a League link when not in a league', () => {
            renderWithRouter(<OverviewTab user={mockUser} currentLeague={null} />);

            const joinLink = screen.getByRole('link', { name: /Join a League/i });
            expect(joinLink).toBeInTheDocument();
            expect(joinLink).toHaveAttribute('href', '/leagues');
        });

        it('should display join league description', () => {
            renderWithRouter(<OverviewTab user={mockUser} currentLeague={null} />);

            expect(screen.getByText('Browse and join an active league')).toBeInTheDocument();
        });
    });

    describe('current league info', () => {
        it('should display Current League section when in a league', () => {
            renderWithRouter(<OverviewTab user={mockUser} currentLeague={mockCurrentLeague} />);

            expect(screen.getByText('Current League')).toBeInTheDocument();
        });

        it('should not display Current League section when not in a league', () => {
            renderWithRouter(<OverviewTab user={mockUser} currentLeague={null} />);

            expect(screen.queryByText('Current League')).not.toBeInTheDocument();
        });

        it('should display league name in current league section', () => {
            renderWithRouter(<OverviewTab user={mockUser} currentLeague={mockCurrentLeague} />);

            // There should be a heading with the league name
            const leagueNames = screen.getAllByText('Test League');
            expect(leagueNames.length).toBeGreaterThan(0);
        });

        it('should display Active badge for active leagues', () => {
            renderWithRouter(<OverviewTab user={mockUser} currentLeague={mockCurrentLeague} />);

            expect(screen.getByText('Active')).toBeInTheDocument();
        });

        it('should display Inactive badge for inactive leagues', () => {
            renderWithRouter(
                <OverviewTab
                    user={mockUser}
                    currentLeague={{ ...mockCurrentLeague, is_active: false }}
                />
            );

            expect(screen.getByText('Inactive')).toBeInTheDocument();
        });

        it('should display rank when available', () => {
            renderWithRouter(<OverviewTab user={mockUser} currentLeague={mockCurrentLeague} />);

            expect(screen.getByText('#3')).toBeInTheDocument();
            expect(screen.getByText('Current Rank')).toBeInTheDocument();
        });

        it('should not display rank when not available', () => {
            renderWithRouter(
                <OverviewTab
                    user={mockUser}
                    currentLeague={{ ...mockCurrentLeague, rank: null }}
                />
            );

            expect(screen.queryByText('Current Rank')).not.toBeInTheDocument();
        });
    });

    describe('league stats', () => {
        it('should display wins', () => {
            renderWithRouter(<OverviewTab user={mockUser} currentLeague={mockCurrentLeague} />);

            expect(screen.getByText('10')).toBeInTheDocument();
            expect(screen.getByText('Wins')).toBeInTheDocument();
        });

        it('should display losses', () => {
            renderWithRouter(<OverviewTab user={mockUser} currentLeague={mockCurrentLeague} />);

            expect(screen.getByText('5')).toBeInTheDocument();
            expect(screen.getByText('Losses')).toBeInTheDocument();
        });

        it('should display draws', () => {
            renderWithRouter(<OverviewTab user={mockUser} currentLeague={mockCurrentLeague} />);

            expect(screen.getByText('2')).toBeInTheDocument();
            expect(screen.getByText('Draws')).toBeInTheDocument();
        });

        it('should display 0 for missing stats', () => {
            renderWithRouter(
                <OverviewTab
                    user={mockUser}
                    currentLeague={{
                        ...mockCurrentLeague,
                        league_wins: null,
                        league_losses: null,
                        league_draws: null
                    }}
                />
            );

            const zeros = screen.getAllByText('0');
            expect(zeros.length).toBeGreaterThanOrEqual(3);
        });
    });

    describe('commander display in league info', () => {
        it('should display commander name when available', () => {
            renderWithRouter(<OverviewTab user={mockUser} currentLeague={mockCurrentLeague} />);

            expect(screen.getByText('Kenrith, the Returned King')).toBeInTheDocument();
        });

        it('should use CommanderDisplay when only commander_id is available', () => {
            renderWithRouter(
                <OverviewTab
                    user={mockUser}
                    currentLeague={{
                        ...mockCurrentLeague,
                        commander_name: null,
                        current_commander: 'some-uuid'
                    }}
                />
            );

            expect(screen.getByTestId('commander-display')).toBeInTheDocument();
        });

        it('should display partner name when available', () => {
            renderWithRouter(
                <OverviewTab
                    user={mockUser}
                    currentLeague={{
                        ...mockCurrentLeague,
                        partner_name: 'Rograkh, Son of Rohgahh',
                        commander_partner: 'partner-uuid'
                    }}
                />
            );

            expect(screen.getByText(/Rograkh, Son of Rohgahh/)).toBeInTheDocument();
        });

        it('should display decklist link when available', () => {
            renderWithRouter(<OverviewTab user={mockUser} currentLeague={mockCurrentLeague} />);

            const decklistLink = screen.getByRole('link', { name: /View Decklist/i });
            expect(decklistLink).toBeInTheDocument();
            expect(decklistLink).toHaveAttribute('href', 'https://moxfield.com/decks/test123');
        });

        it('should not display commander section when no commander set', () => {
            renderWithRouter(
                <OverviewTab
                    user={mockUser}
                    currentLeague={{
                        ...mockCurrentLeague,
                        commander_name: null,
                        current_commander: null
                    }}
                />
            );

            expect(screen.queryByText('Commander')).not.toBeInTheDocument();
        });

        it('should display commander image when scryfall_id is available', () => {
            renderWithRouter(<OverviewTab user={mockUser} currentLeague={mockCurrentLeague} />);

            const commanderImg = screen.getByAltText('Kenrith, the Returned King');
            expect(commanderImg).toBeInTheDocument();
            expect(commanderImg.src).toContain('cards.scryfall.io');
        });

        it('should display hat-wizard icon when scryfall_id is not available', () => {
            renderWithRouter(
                <OverviewTab
                    user={mockUser}
                    currentLeague={{
                        ...mockCurrentLeague,
                        commander_scryfall_id: null
                    }}
                />
            );

            const wizardIcon = document.querySelector('.fa-hat-wizard');
            expect(wizardIcon).toBeInTheDocument();
        });
    });

    describe('account info', () => {
        it('should display Account Info header', () => {
            renderWithRouter(<OverviewTab user={mockUser} currentLeague={null} />);

            expect(screen.getByText('Account Info')).toBeInTheDocument();
        });

        it('should display full name', () => {
            renderWithRouter(<OverviewTab user={mockUser} currentLeague={null} />);

            expect(screen.getByText('Full Name')).toBeInTheDocument();
            expect(screen.getByText('John Doe')).toBeInTheDocument();
        });

        it('should display "Not set" when firstname is null', () => {
            renderWithRouter(
                <OverviewTab
                    user={{ ...mockUser, firstname: null, lastname: null }}
                    currentLeague={null}
                />
            );

            expect(screen.getByText(/Not set/)).toBeInTheDocument();
        });

        it('should display email', () => {
            renderWithRouter(<OverviewTab user={mockUser} currentLeague={null} />);

            expect(screen.getByText('Email')).toBeInTheDocument();
            expect(screen.getByText('john@example.com')).toBeInTheDocument();
        });

        it('should display last active date', () => {
            renderWithRouter(<OverviewTab user={mockUser} currentLeague={null} />);

            expect(screen.getByText('Last Active')).toBeInTheDocument();
            expect(screen.getByText('June 15, 2024')).toBeInTheDocument();
        });

        it('should display "Never" when last_login is null', () => {
            renderWithRouter(
                <OverviewTab
                    user={{ ...mockUser, last_login: null }}
                    currentLeague={null}
                />
            );

            expect(screen.getByText('Never')).toBeInTheDocument();
        });
    });

    describe('quick links', () => {
        it('should display Quick Links header', () => {
            renderWithRouter(<OverviewTab user={mockUser} currentLeague={null} />);

            expect(screen.getByText('Quick Links')).toBeInTheDocument();
        });

        it('should display Edit Profile link', () => {
            renderWithRouter(<OverviewTab user={mockUser} currentLeague={null} />);

            const editProfileLink = screen.getByRole('link', { name: /Edit Profile/i });
            expect(editProfileLink).toBeInTheDocument();
            expect(editProfileLink).toHaveAttribute('href', '/profile?tab=settings');
        });

        it('should display Activity Log link', () => {
            renderWithRouter(<OverviewTab user={mockUser} currentLeague={null} />);

            const activityLink = screen.getByRole('link', { name: /Activity Log/i });
            expect(activityLink).toBeInTheDocument();
            expect(activityLink).toHaveAttribute('href', '/profile?tab=activity');
        });

        it('should display Game History link', () => {
            renderWithRouter(<OverviewTab user={mockUser} currentLeague={null} />);

            const historyLink = screen.getByRole('link', { name: /Game History/i });
            expect(historyLink).toBeInTheDocument();
            expect(historyLink).toHaveAttribute('href', '/pods/history');
        });
    });

    describe('commander image error handling', () => {
        it('should hide image on error', () => {
            renderWithRouter(<OverviewTab user={mockUser} currentLeague={mockCurrentLeague} />);

            const commanderImg = screen.getByAltText('Kenrith, the Returned King');

            // Simulate image error
            fireEvent.error(commanderImg);

            expect(commanderImg.style.display).toBe('none');
        });
    });

    describe('edge cases', () => {
        it('should handle missing decklistUrl gracefully', () => {
            renderWithRouter(
                <OverviewTab
                    user={mockUser}
                    currentLeague={{ ...mockCurrentLeague, decklistUrl: null }}
                />
            );

            expect(screen.queryByText('View Decklist')).not.toBeInTheDocument();
        });

        it('should handle user with only firstname', () => {
            renderWithRouter(
                <OverviewTab
                    user={{ ...mockUser, lastname: null }}
                    currentLeague={null}
                />
            );

            expect(screen.getByText('John')).toBeInTheDocument();
        });

        it('should handle user with only lastname', () => {
            renderWithRouter(
                <OverviewTab
                    user={{ ...mockUser, firstname: null, lastname: 'Doe' }}
                    currentLeague={null}
                />
            );

            expect(screen.getByText(/Not set/)).toBeInTheDocument();
            expect(screen.getByText(/Doe/)).toBeInTheDocument();
        });
    });
});
