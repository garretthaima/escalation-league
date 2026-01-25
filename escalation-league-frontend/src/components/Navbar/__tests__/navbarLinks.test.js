import navbarLinks from '../navbarLinks';

describe('navbarLinks', () => {
    describe('function export', () => {
        it('should export a function', () => {
            expect(typeof navbarLinks).toBe('function');
        });

        it('should return an array when called', () => {
            const result = navbarLinks(false);
            expect(Array.isArray(result)).toBe(true);
        });

        it('should return an array when called with true', () => {
            const result = navbarLinks(true);
            expect(Array.isArray(result)).toBe(true);
        });
    });

    describe('structure of returned links', () => {
        it('should return 6 top-level items', () => {
            const result = navbarLinks(false);
            expect(result).toHaveLength(6);
        });

        it('should maintain same number of items regardless of inLeague', () => {
            const inLeagueResult = navbarLinks(true);
            const notInLeagueResult = navbarLinks(false);
            expect(inLeagueResult).toHaveLength(notInLeagueResult.length);
        });
    });

    describe('Leagues dropdown', () => {
        it('should have Leagues as first item', () => {
            const result = navbarLinks(false);
            expect(result[0].label).toBe('Leagues');
        });

        it('should be a dropdown type', () => {
            const result = navbarLinks(false);
            expect(result[0].type).toBe('dropdown');
        });

        it('should have path /leagues', () => {
            const result = navbarLinks(false);
            expect(result[0].path).toBe('/leagues');
        });

        it('should have order 1', () => {
            const result = navbarLinks(false);
            expect(result[0].order).toBe(1);
        });

        it('should have section public', () => {
            const result = navbarLinks(false);
            expect(result[0].section).toBe('public');
        });

        it('should have icon fa-trophy', () => {
            const result = navbarLinks(false);
            expect(result[0].icon).toBe('fa-trophy');
        });

        it('should have children array', () => {
            const result = navbarLinks(false);
            expect(Array.isArray(result[0].children)).toBe(true);
        });

        describe('when NOT in league (inLeague = false)', () => {
            it('should have only Sign Up link', () => {
                const result = navbarLinks(false);
                expect(result[0].children).toHaveLength(1);
                expect(result[0].children[0].label).toBe('Sign Up');
            });

            it('should have Sign Up with correct path', () => {
                const result = navbarLinks(false);
                expect(result[0].children[0].path).toBe('/leagues/signup');
            });

            it('should have Sign Up with order 1', () => {
                const result = navbarLinks(false);
                expect(result[0].children[0].order).toBe(1);
            });

            it('should have Sign Up with icon fa-user-plus', () => {
                const result = navbarLinks(false);
                expect(result[0].children[0].icon).toBe('fa-user-plus');
            });
        });

        describe('when IN league (inLeague = true)', () => {
            it('should have 4 league links', () => {
                const result = navbarLinks(true);
                expect(result[0].children).toHaveLength(4);
            });

            it('should have Dashboard link first', () => {
                const result = navbarLinks(true);
                expect(result[0].children[0].label).toBe('Dashboard');
                expect(result[0].children[0].path).toBe('/leagues');
                expect(result[0].children[0].order).toBe(1);
                expect(result[0].children[0].icon).toBe('fa-home');
            });

            it('should have Budget link second', () => {
                const result = navbarLinks(true);
                expect(result[0].children[1].label).toBe('Budget');
                expect(result[0].children[1].path).toBe('/leagues/budget');
                expect(result[0].children[1].order).toBe(2);
                expect(result[0].children[1].icon).toBe('fa-coins');
            });

            it('should have Metagame link third', () => {
                const result = navbarLinks(true);
                expect(result[0].children[2].label).toBe('Metagame');
                expect(result[0].children[2].path).toBe('/leagues/metagame');
                expect(result[0].children[2].order).toBe(3);
                expect(result[0].children[2].icon).toBe('fa-chart-pie');
            });

            it('should have Attendance link fourth', () => {
                const result = navbarLinks(true);
                expect(result[0].children[3].label).toBe('Attendance');
                expect(result[0].children[3].path).toBe('/attendance');
                expect(result[0].children[3].order).toBe(4);
                expect(result[0].children[3].icon).toBe('fa-clipboard-check');
            });
        });
    });

    describe('Pods dropdown', () => {
        it('should have Pods as second item', () => {
            const result = navbarLinks(false);
            expect(result[1].label).toBe('Pods');
        });

        it('should be a dropdown type', () => {
            const result = navbarLinks(false);
            expect(result[1].type).toBe('dropdown');
        });

        it('should have path /pods', () => {
            const result = navbarLinks(false);
            expect(result[1].path).toBe('/pods');
        });

        it('should have order 2', () => {
            const result = navbarLinks(false);
            expect(result[1].order).toBe(2);
        });

        it('should have section pods', () => {
            const result = navbarLinks(false);
            expect(result[1].section).toBe('pods');
        });

        it('should have icon fa-users', () => {
            const result = navbarLinks(false);
            expect(result[1].icon).toBe('fa-users');
        });

        it('should have 2 children', () => {
            const result = navbarLinks(false);
            expect(result[1].children).toHaveLength(2);
        });

        it('should have Dashboard as first child', () => {
            const result = navbarLinks(false);
            expect(result[1].children[0].label).toBe('Dashboard');
            expect(result[1].children[0].path).toBe('/pods');
            expect(result[1].children[0].order).toBe(1);
            expect(result[1].children[0].icon).toBe('fa-gamepad');
        });

        it('should have Game History as second child', () => {
            const result = navbarLinks(false);
            expect(result[1].children[1].label).toBe('Game History');
            expect(result[1].children[1].path).toBe('/pods/history');
            expect(result[1].children[1].order).toBe(2);
            expect(result[1].children[1].icon).toBe('fa-history');
        });

        it('should have same pods children regardless of inLeague', () => {
            const inLeague = navbarLinks(true);
            const notInLeague = navbarLinks(false);
            expect(inLeague[1].children).toEqual(notInLeague[1].children);
        });
    });

    describe('Awards link', () => {
        it('should have Awards as third item', () => {
            const result = navbarLinks(false);
            expect(result[2].label).toBe('Awards');
        });

        it('should be a link type', () => {
            const result = navbarLinks(false);
            expect(result[2].type).toBe('link');
        });

        it('should have path /awards', () => {
            const result = navbarLinks(false);
            expect(result[2].path).toBe('/awards');
        });

        it('should have order 3', () => {
            const result = navbarLinks(false);
            expect(result[2].order).toBe(3);
        });

        it('should have section public', () => {
            const result = navbarLinks(false);
            expect(result[2].section).toBe('public');
        });

        it('should have icon fa-medal', () => {
            const result = navbarLinks(false);
            expect(result[2].icon).toBe('fa-medal');
        });

        it('should not have children property', () => {
            const result = navbarLinks(false);
            expect(result[2].children).toBeUndefined();
        });
    });

    describe('Rules link', () => {
        it('should have Rules as fourth item', () => {
            const result = navbarLinks(false);
            expect(result[3].label).toBe('Rules');
        });

        it('should be a link type', () => {
            const result = navbarLinks(false);
            expect(result[3].type).toBe('link');
        });

        it('should have path /rules', () => {
            const result = navbarLinks(false);
            expect(result[3].path).toBe('/rules');
        });

        it('should have order 4', () => {
            const result = navbarLinks(false);
            expect(result[3].order).toBe(4);
        });

        it('should have section public', () => {
            const result = navbarLinks(false);
            expect(result[3].section).toBe('public');
        });

        it('should have icon fa-book', () => {
            const result = navbarLinks(false);
            expect(result[3].icon).toBe('fa-book');
        });
    });

    describe('Leaderboard link', () => {
        it('should have Leaderboard as fifth item', () => {
            const result = navbarLinks(false);
            expect(result[4].label).toBe('Leaderboard');
        });

        it('should be a link type', () => {
            const result = navbarLinks(false);
            expect(result[4].type).toBe('link');
        });

        it('should have path /leaderboard', () => {
            const result = navbarLinks(false);
            expect(result[4].path).toBe('/leaderboard');
        });

        it('should have order 5', () => {
            const result = navbarLinks(false);
            expect(result[4].order).toBe(5);
        });

        it('should have section public', () => {
            const result = navbarLinks(false);
            expect(result[4].section).toBe('public');
        });

        it('should have icon fa-chart-line', () => {
            const result = navbarLinks(false);
            expect(result[4].icon).toBe('fa-chart-line');
        });
    });

    describe('Admin dropdown', () => {
        it('should have Admin as sixth item', () => {
            const result = navbarLinks(false);
            expect(result[5].label).toBe('Admin');
        });

        it('should be a dropdown type', () => {
            const result = navbarLinks(false);
            expect(result[5].type).toBe('dropdown');
        });

        it('should not have a path (admin has no direct path)', () => {
            const result = navbarLinks(false);
            expect(result[5].path).toBeUndefined();
        });

        it('should have order 6', () => {
            const result = navbarLinks(false);
            expect(result[5].order).toBe(6);
        });

        it('should have section admin', () => {
            const result = navbarLinks(false);
            expect(result[5].section).toBe('admin');
        });

        it('should have icon fa-cog', () => {
            const result = navbarLinks(false);
            expect(result[5].icon).toBe('fa-cog');
        });

        it('should have 6 children', () => {
            const result = navbarLinks(false);
            expect(result[5].children).toHaveLength(6);
        });

        describe('Admin children links', () => {
            it('should have League Management first', () => {
                const result = navbarLinks(false);
                expect(result[5].children[0].label).toBe('League Management');
                expect(result[5].children[0].path).toBe('/admin/leagues');
                expect(result[5].children[0].order).toBe(1);
                expect(result[5].children[0].icon).toBe('fa-trophy');
            });

            it('should have Pods second', () => {
                const result = navbarLinks(false);
                expect(result[5].children[1].label).toBe('Pods');
                expect(result[5].children[1].path).toBe('/admin/pods');
                expect(result[5].children[1].order).toBe(2);
                expect(result[5].children[1].icon).toBe('fa-users');
            });

            it('should have Attendance third', () => {
                const result = navbarLinks(false);
                expect(result[5].children[2].label).toBe('Attendance');
                expect(result[5].children[2].path).toBe('/admin/attendance');
                expect(result[5].children[2].order).toBe(3);
                expect(result[5].children[2].icon).toBe('fa-clipboard-list');
            });

            it('should have User Roles fourth', () => {
                const result = navbarLinks(false);
                expect(result[5].children[3].label).toBe('User Roles');
                expect(result[5].children[3].path).toBe('/admin/users');
                expect(result[5].children[3].order).toBe(4);
                expect(result[5].children[3].icon).toBe('fa-user-shield');
            });

            it('should have Matchup Matrix fifth', () => {
                const result = navbarLinks(false);
                expect(result[5].children[4].label).toBe('Matchup Matrix');
                expect(result[5].children[4].path).toBe('/admin/matchup-matrix');
                expect(result[5].children[4].order).toBe(5);
                expect(result[5].children[4].icon).toBe('fa-th');
            });

            it('should have Activity Logs sixth', () => {
                const result = navbarLinks(false);
                expect(result[5].children[5].label).toBe('Activity Logs');
                expect(result[5].children[5].path).toBe('/admin/activity-logs');
                expect(result[5].children[5].order).toBe(6);
                expect(result[5].children[5].icon).toBe('fa-history');
            });
        });

        it('should have same admin children regardless of inLeague', () => {
            const inLeague = navbarLinks(true);
            const notInLeague = navbarLinks(false);
            expect(inLeague[5].children).toEqual(notInLeague[5].children);
        });
    });

    describe('ordering', () => {
        it('should have items in correct order by order property', () => {
            const result = navbarLinks(false);
            for (let i = 0; i < result.length - 1; i++) {
                expect(result[i].order).toBeLessThan(result[i + 1].order);
            }
        });

        it('should have orders from 1 to 6', () => {
            const result = navbarLinks(false);
            const orders = result.map((item) => item.order);
            expect(orders).toEqual([1, 2, 3, 4, 5, 6]);
        });
    });

    describe('sections', () => {
        it('should have correct sections for each item', () => {
            const result = navbarLinks(false);
            expect(result[0].section).toBe('public'); // Leagues
            expect(result[1].section).toBe('pods'); // Pods
            expect(result[2].section).toBe('public'); // Awards
            expect(result[3].section).toBe('public'); // Rules
            expect(result[4].section).toBe('public'); // Leaderboard
            expect(result[5].section).toBe('admin'); // Admin
        });
    });

    describe('types', () => {
        it('should have correct types for each item', () => {
            const result = navbarLinks(false);
            expect(result[0].type).toBe('dropdown'); // Leagues
            expect(result[1].type).toBe('dropdown'); // Pods
            expect(result[2].type).toBe('link'); // Awards
            expect(result[3].type).toBe('link'); // Rules
            expect(result[4].type).toBe('link'); // Leaderboard
            expect(result[5].type).toBe('dropdown'); // Admin
        });

        it('should have 3 dropdowns and 3 links', () => {
            const result = navbarLinks(false);
            const dropdowns = result.filter((item) => item.type === 'dropdown');
            const links = result.filter((item) => item.type === 'link');
            expect(dropdowns).toHaveLength(3);
            expect(links).toHaveLength(3);
        });
    });

    describe('icons', () => {
        it('should have all top-level items with icons', () => {
            const result = navbarLinks(false);
            result.forEach((item) => {
                expect(item.icon).toBeDefined();
                expect(item.icon).toMatch(/^fa-/);
            });
        });

        it('should have all children with icons', () => {
            const result = navbarLinks(true);
            result.forEach((item) => {
                if (item.children) {
                    item.children.forEach((child) => {
                        expect(child.icon).toBeDefined();
                        expect(child.icon).toMatch(/^fa-/);
                    });
                }
            });
        });
    });

    describe('immutability', () => {
        it('should return new array on each call', () => {
            const result1 = navbarLinks(false);
            const result2 = navbarLinks(false);
            expect(result1).not.toBe(result2);
        });

        it('should return different arrays for different inLeague values', () => {
            const inLeague = navbarLinks(true);
            const notInLeague = navbarLinks(false);
            expect(inLeague).not.toBe(notInLeague);
        });

        it('should have different children for Leagues based on inLeague', () => {
            const inLeague = navbarLinks(true);
            const notInLeague = navbarLinks(false);
            expect(inLeague[0].children).not.toEqual(notInLeague[0].children);
        });
    });
});
