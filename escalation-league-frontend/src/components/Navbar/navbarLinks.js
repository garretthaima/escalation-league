const getLeagueLinks = (inLeague, leaguePhase) => {
    if (inLeague) {
        const links = [
            { label: 'Dashboard', path: '/leagues', order: 1, icon: 'fa-home' },
            { label: 'Budget', path: '/leagues/budget', order: 2, icon: 'fa-coins' },
            { label: 'Metagame', path: '/leagues/metagame', order: 3, icon: 'fa-chart-pie' },
            { label: 'Attendance', path: '/attendance', order: 4, icon: 'fa-clipboard-check' },
        ];
        // Only show Tournament link when league is in tournament or completed phase
        if (leaguePhase === 'tournament' || leaguePhase === 'completed') {
            links.push({ label: 'Tournament', path: '/leagues/tournament', order: 5, icon: 'fa-trophy' });
        }
        return links;
    } else {
        return [
            { label: 'Sign Up', path: '/leagues/signup', order: 1, icon: 'fa-user-plus' },
        ];
    }
};

const getPodsLinks = () => [
    { label: 'Dashboard', path: '/pods', order: 1, icon: 'fa-gamepad' },
    { label: 'Game History', path: '/pods/history', order: 2, icon: 'fa-history' },
];

const navbarLinks = (inLeague, leaguePhase) => [
    {
        label: 'Leagues',
        path: '/leagues',
        order: 1,
        section: 'public',
        type: 'dropdown',
        icon: 'fa-trophy',
        children: getLeagueLinks(inLeague, leaguePhase),
    },
    {
        label: 'Pods',
        path: '/pods',
        order: 2,
        section: 'pods',
        type: 'dropdown',
        icon: 'fa-users',
        children: getPodsLinks(),
    },
    { label: 'Awards', path: '/awards', order: 3, section: 'public', type: 'link', icon: 'fa-medal' },
    { label: 'Rules', path: '/rules', order: 4, section: 'public', type: 'link', icon: 'fa-book' },
    { label: 'Leaderboard', path: '/leaderboard', order: 5, section: 'public', type: 'link', icon: 'fa-chart-line' },
    {
        label: 'Admin',
        order: 6,
        section: 'admin',
        type: 'dropdown',
        icon: 'fa-cog',
        children: [
            { label: 'League Management', path: '/admin/leagues', order: 1, icon: 'fa-trophy' },
            { label: 'User Roles', path: '/admin/users', order: 2, icon: 'fa-user-shield' },
            { label: 'Activity Logs', path: '/admin/activity-logs', order: 3, icon: 'fa-history' },
        ],
    },
];

export default navbarLinks;