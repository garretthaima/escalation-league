import React from 'react';
import { render, screen } from '@testing-library/react';
import {
    getPodStatusBadge,
    getResultBadge,
    getLeagueStatusBadge,
    getUserStatusBadge,
    getConfirmationBadge
} from '../badgeHelpers';

describe('badgeHelpers', () => {
    describe('getPodStatusBadge', () => {
        it('should render Open badge for open status', () => {
            render(getPodStatusBadge('open'));
            expect(screen.getByText('Open')).toBeInTheDocument();
        });

        it('should render Active badge for active status', () => {
            render(getPodStatusBadge('active'));
            expect(screen.getByText('Active')).toBeInTheDocument();
        });

        it('should render Pending badge for pending status', () => {
            render(getPodStatusBadge('pending'));
            expect(screen.getByText('Pending')).toBeInTheDocument();
        });

        it('should render Complete badge for complete status', () => {
            render(getPodStatusBadge('complete'));
            expect(screen.getByText('Complete')).toBeInTheDocument();
        });

        it('should render unknown status as-is with fallback icon', () => {
            render(getPodStatusBadge('unknown'));
            expect(screen.getByText('unknown')).toBeInTheDocument();
        });

        it('should include appropriate icons', () => {
            const { container } = render(getPodStatusBadge('open'));
            expect(container.querySelector('.fa-door-open')).toBeInTheDocument();
        });

        it('should have badge class', () => {
            const { container } = render(getPodStatusBadge('active'));
            expect(container.querySelector('.badge')).toBeInTheDocument();
        });
    });

    describe('getResultBadge', () => {
        it('should render Win badge for win result', () => {
            render(getResultBadge('win'));
            expect(screen.getByText('Win')).toBeInTheDocument();
        });

        it('should render Loss badge for loss result', () => {
            render(getResultBadge('loss'));
            expect(screen.getByText('Loss')).toBeInTheDocument();
        });

        it('should render Draw badge for draw result', () => {
            render(getResultBadge('draw'));
            expect(screen.getByText('Draw')).toBeInTheDocument();
        });

        it('should include trophy icon for win', () => {
            const { container } = render(getResultBadge('win'));
            expect(container.querySelector('.fa-trophy')).toBeInTheDocument();
        });

        it('should include times-circle icon for loss', () => {
            const { container } = render(getResultBadge('loss'));
            expect(container.querySelector('.fa-times-circle')).toBeInTheDocument();
        });

        it('should include handshake icon for draw', () => {
            const { container } = render(getResultBadge('draw'));
            expect(container.querySelector('.fa-handshake')).toBeInTheDocument();
        });

        it('should render unknown result as-is', () => {
            render(getResultBadge('forfeit'));
            expect(screen.getByText('forfeit')).toBeInTheDocument();
        });
    });

    describe('getLeagueStatusBadge', () => {
        it('should render Active badge for active league', () => {
            render(getLeagueStatusBadge(true));
            expect(screen.getByText('Active')).toBeInTheDocument();
        });

        it('should render Inactive badge for inactive league', () => {
            render(getLeagueStatusBadge(false));
            expect(screen.getByText('Inactive')).toBeInTheDocument();
        });

        it('should include circle icon for active', () => {
            const { container } = render(getLeagueStatusBadge(true));
            expect(container.querySelector('.fa-circle')).toBeInTheDocument();
        });

        it('should include pause-circle icon for inactive', () => {
            const { container } = render(getLeagueStatusBadge(false));
            expect(container.querySelector('.fa-pause-circle')).toBeInTheDocument();
        });
    });

    describe('getUserStatusBadge', () => {
        it('should render Banned badge for banned user', () => {
            render(getUserStatusBadge({ is_banned: true, is_active: true }));
            expect(screen.getByText('Banned')).toBeInTheDocument();
        });

        it('should render Inactive badge for inactive user', () => {
            render(getUserStatusBadge({ is_banned: false, is_active: false }));
            expect(screen.getByText('Inactive')).toBeInTheDocument();
        });

        it('should render Active badge for active non-banned user', () => {
            render(getUserStatusBadge({ is_banned: false, is_active: true }));
            expect(screen.getByText('Active')).toBeInTheDocument();
        });

        it('should prioritize banned status over inactive', () => {
            render(getUserStatusBadge({ is_banned: true, is_active: false }));
            expect(screen.getByText('Banned')).toBeInTheDocument();
        });

        it('should include ban icon for banned user', () => {
            const { container } = render(getUserStatusBadge({ is_banned: true, is_active: true }));
            expect(container.querySelector('.fa-ban')).toBeInTheDocument();
        });

        it('should include exclamation-triangle icon for inactive user', () => {
            const { container } = render(getUserStatusBadge({ is_banned: false, is_active: false }));
            expect(container.querySelector('.fa-exclamation-triangle')).toBeInTheDocument();
        });

        it('should include check-circle icon for active user', () => {
            const { container } = render(getUserStatusBadge({ is_banned: false, is_active: true }));
            expect(container.querySelector('.fa-check-circle')).toBeInTheDocument();
        });
    });

    describe('getConfirmationBadge', () => {
        it('should render Confirmed badge for confirmed', () => {
            render(getConfirmationBadge(true));
            expect(screen.getByText('Confirmed')).toBeInTheDocument();
        });

        it('should render Pending badge for not confirmed', () => {
            render(getConfirmationBadge(false));
            expect(screen.getByText('Pending')).toBeInTheDocument();
        });

        it('should include check icon for confirmed', () => {
            const { container } = render(getConfirmationBadge(true));
            expect(container.querySelector('.fa-check')).toBeInTheDocument();
        });

        it('should include clock icon for pending', () => {
            const { container } = render(getConfirmationBadge(false));
            expect(container.querySelector('.fa-clock')).toBeInTheDocument();
        });
    });

    describe('badge styling', () => {
        it('should have white text color for all badges', () => {
            const { container } = render(getPodStatusBadge('open'));
            const badge = container.querySelector('.badge');
            expect(badge).toHaveStyle({ color: 'white' });
        });

        it('should have inline backgroundColor styles', () => {
            const { container } = render(getResultBadge('win'));
            const badge = container.querySelector('.badge');
            expect(badge).toHaveAttribute('style');
            expect(badge.style.backgroundColor).toBeTruthy();
        });
    });
});
