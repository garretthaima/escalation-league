import React from 'react';
import { render, screen } from '@testing-library/react';
import Rules from '../Rules';

describe('Rules', () => {
    describe('hero section', () => {
        it('should render the main page heading', () => {
            render(<Rules />);
            expect(screen.getByRole('heading', { name: /Escalation League Rules/i })).toBeInTheDocument();
        });

        it('should render the subtitle text', () => {
            render(<Rules />);
            expect(screen.getByText('Everything you need to know about competing in the Escalation League')).toBeInTheDocument();
        });
    });

    describe('league entry section', () => {
        it('should render League Entry heading', () => {
            render(<Rules />);
            expect(screen.getByRole('heading', { name: /League Entry/i })).toBeInTheDocument();
        });

        it('should display entry fee amount', () => {
            render(<Rules />);
            expect(screen.getByText('$30')).toBeInTheDocument();
        });

        it('should display Entry Fee label', () => {
            render(<Rules />);
            expect(screen.getByText('Entry Fee')).toBeInTheDocument();
        });

        it('should mention payment methods', () => {
            render(<Rules />);
            expect(screen.getByText(/Payment is due during your first EL game night/)).toBeInTheDocument();
            expect(screen.getByText(/Cash or Venmo/)).toBeInTheDocument();
        });
    });

    describe('season structure section', () => {
        it('should render Season Structure heading', () => {
            render(<Rules />);
            expect(screen.getByRole('heading', { name: /Season Structure/i })).toBeInTheDocument();
        });

        it('should display 16 weeks', () => {
            render(<Rules />);
            expect(screen.getByText('16')).toBeInTheDocument();
            expect(screen.getByText('Weeks')).toBeInTheDocument();
        });

        it('should display minimum pod size', () => {
            render(<Rules />);
            expect(screen.getByText('3+')).toBeInTheDocument();
            expect(screen.getByText('Min Pod Size')).toBeInTheDocument();
        });

        it('should display week cycle', () => {
            render(<Rules />);
            expect(screen.getByText('Thu-Wed')).toBeInTheDocument();
            expect(screen.getByText('Week Cycle')).toBeInTheDocument();
        });

        it('should mention game certification', () => {
            render(<Rules />);
            expect(screen.getByText(/All players must certify a game for points to be distributed/)).toBeInTheDocument();
        });
    });

    describe('deck requirements section', () => {
        it('should render Deck Requirements heading', () => {
            render(<Rules />);
            expect(screen.getByRole('heading', { name: /Deck Requirements/i })).toBeInTheDocument();
        });

        it('should display starting budget', () => {
            render(<Rules />);
            expect(screen.getByText(/Starting Budget/)).toBeInTheDocument();
            expect(screen.getByText(/Maximum \$75/)).toBeInTheDocument();
        });

        it('should mention basic lands', () => {
            render(<Rules />);
            expect(screen.getByText(/Basic Lands/)).toBeInTheDocument();
            expect(screen.getByText(/Do not count toward budget/)).toBeInTheDocument();
        });

        it('should mention banned cards', () => {
            render(<Rules />);
            expect(screen.getByText(/Banned Cards/)).toBeInTheDocument();
        });

        it('should have link to Commander Ban List', () => {
            render(<Rules />);
            const banListLink = screen.getByRole('link', { name: 'Commander Ban List' });
            expect(banListLink).toHaveAttribute('href', 'https://magic.wizards.com/en/banned-restricted-list');
            expect(banListLink).toHaveAttribute('target', '_blank');
            expect(banListLink).toHaveAttribute('rel', 'noopener noreferrer');
        });

        it('should mention proxies', () => {
            render(<Rules />);
            expect(screen.getByText(/Proxies/)).toBeInTheDocument();
            expect(screen.getByText(/Color-only printed proxies are allowed/)).toBeInTheDocument();
        });
    });

    describe('weekly budget section', () => {
        it('should render Weekly Budget heading', () => {
            render(<Rules />);
            expect(screen.getByRole('heading', { name: /Weekly Budget/i })).toBeInTheDocument();
        });

        it('should display weekly budget amount', () => {
            render(<Rules />);
            expect(screen.getByText(/\+\$11 \/ week/)).toBeInTheDocument();
        });

        it('should mention TCG Market pricing', () => {
            render(<Rules />);
            expect(screen.getByText('TCG Market low pricing')).toBeInTheDocument();
        });

        it('should mention budget accumulation', () => {
            render(<Rules />);
            expect(screen.getByText('Unused budget accumulates week over week')).toBeInTheDocument();
        });

        it('should mention commander switching', () => {
            render(<Rules />);
            expect(screen.getByText('Commanders can be switched using accumulated budget')).toBeInTheDocument();
        });
    });

    describe('deck lock-in process section', () => {
        it('should render Deck Lock-In Process heading', () => {
            render(<Rules />);
            expect(screen.getByRole('heading', { name: /Deck Lock-In Process/i })).toBeInTheDocument();
        });

        it('should display step 1', () => {
            render(<Rules />);
            expect(screen.getByText(/Lock in your deck anytime before the season starts/)).toBeInTheDocument();
        });

        it('should display step 2 with deadline', () => {
            render(<Rules />);
            expect(screen.getByText(/Decklists are posted on season start day/)).toBeInTheDocument();
            expect(screen.getByText(/12 PM/)).toBeInTheDocument();
        });

        it('should display step 3', () => {
            render(<Rules />);
            expect(screen.getByText(/Update your decklist weekly before your first game of the week/)).toBeInTheDocument();
        });

        it('should display step 4', () => {
            render(<Rules />);
            expect(screen.getByText(/Decklist links must remain accessible for the entire season/)).toBeInTheDocument();
        });

        it('should display Moxfield tip', () => {
            render(<Rules />);
            expect(screen.getByText(/Tip:/)).toBeInTheDocument();
            expect(screen.getByText(/Moxfield's "Update to lowest pricing" option/)).toBeInTheDocument();
        });
    });

    describe('scoring system section', () => {
        it('should render Scoring System heading', () => {
            render(<Rules />);
            expect(screen.getByRole('heading', { name: /Scoring System/i })).toBeInTheDocument();
        });

        it('should display win points', () => {
            render(<Rules />);
            // Use getAllByText since '4' appears multiple times (win points and tournament rounds)
            const fourElements = screen.getAllByText('4');
            expect(fourElements.length).toBeGreaterThanOrEqual(1);
            expect(screen.getByText('Win')).toBeInTheDocument();
        });

        it('should display non-win points', () => {
            render(<Rules />);
            // Use getAllByText since '1' might appear elsewhere
            const oneElements = screen.getAllByText('1');
            expect(oneElements.length).toBeGreaterThanOrEqual(1);
            expect(screen.getByText('Non-Win')).toBeInTheDocument();
        });

        it('should display scoop points', () => {
            render(<Rules />);
            // Use getAllByText since '0' might appear elsewhere
            const zeroElements = screen.getAllByText('0');
            expect(zeroElements.length).toBeGreaterThanOrEqual(1);
            expect(screen.getByText('Scoop')).toBeInTheDocument();
        });
    });

    describe('playoff qualification section', () => {
        it('should render Playoff Qualification heading', () => {
            render(<Rules />);
            expect(screen.getByRole('heading', { name: /Playoff Qualification/i })).toBeInTheDocument();
        });

        it('should display qualification percentage', () => {
            render(<Rules />);
            expect(screen.getByText('Top 75% Qualify')).toBeInTheDocument();
        });

        it('should mention tiebreaker order', () => {
            render(<Rules />);
            expect(screen.getByText(/Tiebreaker Order:/)).toBeInTheDocument();
            expect(screen.getByText(/Points.*Win Rate.*Games Won.*Games Played.*Arm Wrestle/)).toBeInTheDocument();
        });
    });

    describe('final tournament section', () => {
        it('should render Final Tournament heading', () => {
            render(<Rules />);
            expect(screen.getByRole('heading', { name: /Final Tournament/i })).toBeInTheDocument();
        });

        it('should display format', () => {
            render(<Rules />);
            expect(screen.getByText(/Format:/)).toBeInTheDocument();
            expect(screen.getByText('4 rounds')).toBeInTheDocument();
        });

        it('should display championship info', () => {
            render(<Rules />);
            expect(screen.getByText(/Championship:/)).toBeInTheDocument();
            expect(screen.getByText(/Top 4 players play single elimination/)).toBeInTheDocument();
        });

        it('should display tournament scoring', () => {
            render(<Rules />);
            expect(screen.getByText(/Win = 4, Non-Win = 1, Scoop = 0/)).toBeInTheDocument();
        });
    });

    describe('prize support section', () => {
        it('should render Prize Support heading', () => {
            render(<Rules />);
            expect(screen.getByRole('heading', { name: /Prize Support/i })).toBeInTheDocument();
        });

        it('should display first place prize', () => {
            render(<Rules />);
            expect(screen.getByText('1st')).toBeInTheDocument();
            // "1 Set Box" appears in multiple prizes, so use getAllByText
            const setBoxElements = screen.getAllByText(/1 Set Box/);
            expect(setBoxElements.length).toBeGreaterThanOrEqual(1);
        });

        it('should display 2nd-4th place prize', () => {
            render(<Rules />);
            expect(screen.getByText('2nd-4th')).toBeInTheDocument();
            expect(screen.getByText(/Split/)).toBeInTheDocument();
        });

        it('should display voted awards', () => {
            render(<Rules />);
            expect(screen.getByText('Voted Awards')).toBeInTheDocument();
            expect(screen.getByText('MVP')).toBeInTheDocument();
            expect(screen.getByText('Coolest Deck')).toBeInTheDocument();
            expect(screen.getByText('Most Hated Deck')).toBeInTheDocument();
            expect(screen.getByText('Most Improved')).toBeInTheDocument();
            expect(screen.getByText('Highest Win Rate')).toBeInTheDocument();
        });

        it('should display prize disclaimer', () => {
            render(<Rules />);
            expect(screen.getByText(/All prizes subject to season budget and commissioner discretion/)).toBeInTheDocument();
        });
    });

    describe('banned commanders section', () => {
        it('should render Banned Commanders heading', () => {
            render(<Rules />);
            expect(screen.getByRole('heading', { name: /Banned Commanders/i })).toBeInTheDocument();
        });

        it('should display ban list notice', () => {
            render(<Rules />);
            expect(screen.getByText(/The banned commander list will be provided by the league commissioner/)).toBeInTheDocument();
        });
    });

    describe('structure and styling', () => {
        it('should have container class', () => {
            const { container } = render(<Rules />);
            expect(container.querySelector('.container')).toBeInTheDocument();
        });

        it('should have mt-4 and mb-5 margin classes', () => {
            const { container } = render(<Rules />);
            expect(container.querySelector('.mt-4')).toBeInTheDocument();
            expect(container.querySelector('.mb-5')).toBeInTheDocument();
        });

        it('should render multiple cards', () => {
            const { container } = render(<Rules />);
            const cards = container.querySelectorAll('.card');
            expect(cards.length).toBeGreaterThanOrEqual(10);
        });

        it('should render card headers', () => {
            const { container } = render(<Rules />);
            const cardHeaders = container.querySelectorAll('.card-header');
            expect(cardHeaders.length).toBeGreaterThanOrEqual(10);
        });

        it('should render card bodies', () => {
            const { container } = render(<Rules />);
            const cardBodies = container.querySelectorAll('.card-body');
            expect(cardBodies.length).toBeGreaterThanOrEqual(10);
        });

        it('should use Bootstrap row and col classes', () => {
            const { container } = render(<Rules />);
            expect(container.querySelector('.row')).toBeInTheDocument();
            expect(container.querySelector('[class*="col-"]')).toBeInTheDocument();
        });

        it('should have badges for visual elements', () => {
            const { container } = render(<Rules />);
            const badges = container.querySelectorAll('.badge');
            expect(badges.length).toBeGreaterThanOrEqual(5);
        });
    });

    describe('icons', () => {
        it('should render Font Awesome icons', () => {
            const { container } = render(<Rules />);
            const icons = container.querySelectorAll('.fas, .fa');
            expect(icons.length).toBeGreaterThanOrEqual(10);
        });
    });

    describe('responsive design', () => {
        it('should have col-md-6 classes for medium screens', () => {
            const { container } = render(<Rules />);
            expect(container.querySelector('.col-md-6')).toBeInTheDocument();
        });

        it('should have col-lg-6 classes for large screens', () => {
            const { container } = render(<Rules />);
            expect(container.querySelector('.col-lg-6')).toBeInTheDocument();
        });

        it('should have col-12 for full-width sections', () => {
            const { container } = render(<Rules />);
            expect(container.querySelector('.col-12')).toBeInTheDocument();
        });
    });

    describe('alert elements', () => {
        it('should render info alert with tip', () => {
            const { container } = render(<Rules />);
            const alert = container.querySelector('.alert-info');
            expect(alert).toBeInTheDocument();
        });
    });
});
