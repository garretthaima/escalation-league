const getLeagueLinks = (inLeague) => {
    if (inLeague) {
        return [
            { label: 'Current League', path: '/leagues/current', order: 1, icon: 'fa-trophy' },
            { label: 'Leaderboard', path: '/leagues/leaderboard', order: 2, icon: 'fa-chart-line' },
            { label: 'Attendance', path: '/attendance', order: 3, icon: 'fa-clipboard-check' },
        ];
    } else {
        return [
            { label: 'Sign Up', path: '/leagues/signup', order: 1, icon: 'fa-user-plus' },
        ];
    }
};

const getPodsLinks = () => [
    { label: 'Active Pods', path: '/pods/active', order: 1, icon: 'fa-list' },
    { label: 'Pending Pods', path: '/pods/pending', order: 2, icon: 'fa-plus-circle' },
    { label: 'Completed Pods', path: '/pods/complete', order: 3, icon: 'fa-info-circle' },
];

const navbarLinks = (inLeague) => [
    {
        label: 'Leagues',
        path: '/leagues',
        order: 1,
        section: 'public',
        type: 'dropdown',
        icon: 'fa-trophy',
        children: getLeagueLinks(inLeague),
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
    {
        label: 'Admin',
        order: 5,
        section: 'admin',
        type: 'dropdown',
        icon: 'fa-cog',
        children: [
            { label: 'League Management', path: '/admin/leagues', order: 1, icon: 'fa-trophy' },
            { label: 'Pods', path: '/admin/pods', order: 2, icon: 'fa-users' },
            { label: 'Attendance', path: '/admin/attendance', order: 3, icon: 'fa-clipboard-list' },
            { label: 'User Roles', path: '/admin/users', order: 4, icon: 'fa-user-shield' },
            { label: 'Matchup Matrix', path: '/admin/matchup-matrix', order: 5, icon: 'fa-th' },
        ],
    },
];

export default navbarLinks;