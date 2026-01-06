const getLeagueLinks = (inLeague) => {
    if (inLeague) {
        return [
            { label: 'Current League', path: '/leagues/current', order: 1, icon: 'fa-trophy' },
            { label: 'Leaderboard', path: '/leagues/leaderboard', order: 2, icon: 'fa-chart-line' },
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
        children: getLeagueLinks(inLeague),
    },
    {
        label: 'Pods',
        path: '/pods',
        order: 2,
        section: 'pods',
        type: 'dropdown',
        children: getPodsLinks(),
    },
    { label: 'Awards', path: '/awards', order: 3, section: 'public', type: 'link' },
    { label: 'Rules', path: '/rules', order: 4, section: 'public', type: 'link' },
    {
        label: 'Admin',
        order: 5,
        section: 'admin',
        type: 'dropdown',
        children: [
            { label: 'League Management', path: '/admin/leagues', order: 1 },
            { label: 'Pods', path: '/admin/pods', order: 2 },
        ],
    },
];

export default navbarLinks;