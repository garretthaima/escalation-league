import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotificationCenter from '../NotificationCenter';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    Link: ({ children, to }) => <a href={to}>{children}</a>,
    NavLink: ({ children, to, className }) => <a href={to} className={typeof className === 'function' ? className({ isActive: false }) : className}>{children}</a>,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/' }),
    MemoryRouter: ({ children }) => <>{children}</>,
}));

// Mock WebSocket context
const mockSocket = {
    on: jest.fn(),
    off: jest.fn(),
};

jest.mock('../../../context/WebSocketProvider', () => ({
    useWebSocket: () => ({
        socket: mockSocket,
        connected: true,
    }),
}));

// Mock notifications API
jest.mock('../../../api/notificationsApi', () => ({
    getNotifications: jest.fn(),
    getUnreadCount: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
}));

// Mock createPortal
jest.mock('react-dom', () => {
    const originalModule = jest.requireActual('react-dom');
    return {
        ...originalModule,
        createPortal: (node) => node,
    };
});

// Mock dateFormatter to avoid axios import issues
jest.mock('../../../utils/dateFormatter', () => ({
    formatDate: (date, options = {}) => {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', ...options });
    },
    formatDateTime: (date) => new Date(date).toLocaleString('en-US'),
    formatDateWithWeekday: (date) => new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    formatRelativeTime: (date) => {
        // Return simple relative time for testing
        const d = new Date(date);
        const now = new Date();
        const diffMs = now - d;
        const diffMin = Math.floor(diffMs / (1000 * 60));
        const diffHour = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMin < 1) return 'Just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        if (diffHour < 24) return `${diffHour}h ago`;
        return `${diffDay}d ago`;
    },
    initTimezone: jest.fn().mockResolvedValue('America/Chicago'),
    setTimezoneLoader: jest.fn(),
    getTimezone: () => 'America/Chicago',
}));

// Import mocked modules
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from '../../../api/notificationsApi';

describe('NotificationCenter', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Default mock implementations
        getUnreadCount.mockResolvedValue({ count: 0 });
        getNotifications.mockResolvedValue({ notifications: [] });
        markAsRead.mockResolvedValue({ message: 'success' });
        markAllAsRead.mockResolvedValue({ message: 'success', count: 0 });

        // Reset window size
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 1024,
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    const renderComponent = () => {
        return render(
            <MemoryRouter>
                <NotificationCenter />
            </MemoryRouter>
        );
    };

    describe('basic rendering', () => {
        it('should render notification bell button', async () => {
            renderComponent();
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
            });
        });

        it('should render bell icon', async () => {
            const { container } = renderComponent();
            await waitFor(() => {
                const icon = container.querySelector('.fa-bell');
                expect(icon).toBeInTheDocument();
            });
        });

        it('should fetch unread count on mount', async () => {
            renderComponent();
            await waitFor(() => {
                expect(getUnreadCount).toHaveBeenCalled();
            });
        });
    });

    describe('unread badge display', () => {
        it('should not show badge when unread count is 0', async () => {
            getUnreadCount.mockResolvedValue({ count: 0 });
            renderComponent();
            await waitFor(() => {
                expect(screen.queryByText('0')).not.toBeInTheDocument();
            });
        });

        it('should show badge with unread count', async () => {
            getUnreadCount.mockResolvedValue({ count: 5 });
            renderComponent();
            await waitFor(() => {
                expect(screen.getByText('5')).toBeInTheDocument();
            });
        });

        it('should show 99+ when count exceeds 99', async () => {
            getUnreadCount.mockResolvedValue({ count: 150 });
            renderComponent();
            await waitFor(() => {
                expect(screen.getByText('99+')).toBeInTheDocument();
            });
        });

        it('should show exact count for 99', async () => {
            getUnreadCount.mockResolvedValue({ count: 99 });
            renderComponent();
            await waitFor(() => {
                expect(screen.getByText('99')).toBeInTheDocument();
            });
        });
    });

    describe('dropdown toggle', () => {
        it('should open dropdown when bell is clicked', async () => {
            getNotifications.mockResolvedValue({ notifications: [] });
            renderComponent();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
            });

            const bellButton = screen.getByRole('button', { name: /notifications/i });
            fireEvent.click(bellButton);

            await waitFor(() => {
                expect(screen.getByText('Notifications')).toBeInTheDocument();
            });
        });

        it('should close dropdown when bell is clicked again', async () => {
            getNotifications.mockResolvedValue({ notifications: [] });
            renderComponent();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
            });

            const bellButton = screen.getByRole('button', { name: /notifications/i });
            fireEvent.click(bellButton);

            await waitFor(() => {
                expect(screen.getByText('Notifications')).toBeInTheDocument();
            });

            fireEvent.click(bellButton);

            await waitFor(() => {
                expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
            });
        });

        it('should fetch notifications when dropdown opens', async () => {
            getNotifications.mockResolvedValue({ notifications: [] });
            renderComponent();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
            });

            const bellButton = screen.getByRole('button', { name: /notifications/i });
            fireEvent.click(bellButton);

            await waitFor(() => {
                expect(getNotifications).toHaveBeenCalledWith(10, 0);
            });
        });
    });

    describe('notification list display', () => {
        it('should show loading state while fetching', async () => {
            let resolvePromise;
            getNotifications.mockReturnValue(
                new Promise((resolve) => {
                    resolvePromise = resolve;
                })
            );

            renderComponent();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
            });

            const bellButton = screen.getByRole('button', { name: /notifications/i });
            fireEvent.click(bellButton);

            await waitFor(() => {
                expect(screen.getByText('Loading...')).toBeInTheDocument();
            });

            act(() => {
                resolvePromise({ notifications: [] });
            });
        });

        it('should show empty state when no notifications', async () => {
            getNotifications.mockResolvedValue({ notifications: [] });
            renderComponent();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
            });

            const bellButton = screen.getByRole('button', { name: /notifications/i });
            fireEvent.click(bellButton);

            await waitFor(() => {
                expect(screen.getByText('No notifications')).toBeInTheDocument();
            });
        });

        it('should display notification items', async () => {
            const notifications = [
                {
                    id: 1,
                    title: 'Test Notification',
                    message: 'This is a test message',
                    type: 'info',
                    is_read: false,
                    created_at: new Date().toISOString(),
                },
            ];
            getNotifications.mockResolvedValue({ notifications });
            renderComponent();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
            });

            const bellButton = screen.getByRole('button', { name: /notifications/i });
            fireEvent.click(bellButton);

            await waitFor(() => {
                expect(screen.getByText('Test Notification')).toBeInTheDocument();
                expect(screen.getByText('This is a test message')).toBeInTheDocument();
            });
        });

        it('should display notification without message', async () => {
            const notifications = [
                {
                    id: 1,
                    title: 'Title Only',
                    type: 'info',
                    is_read: true,
                    created_at: new Date().toISOString(),
                },
            ];
            getNotifications.mockResolvedValue({ notifications });
            renderComponent();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
            });

            const bellButton = screen.getByRole('button', { name: /notifications/i });
            fireEvent.click(bellButton);

            await waitFor(() => {
                expect(screen.getByText('Title Only')).toBeInTheDocument();
            });
        });
    });

    describe('notification type icons', () => {
        const notificationTypes = [
            { type: 'success', iconClass: 'fa-check-circle' },
            { type: 'warning', iconClass: 'fa-exclamation-triangle' },
            { type: 'error', iconClass: 'fa-times-circle' },
            { type: 'info', iconClass: 'fa-info-circle' },
            { type: 'unknown', iconClass: 'fa-info-circle' },
        ];

        notificationTypes.forEach(({ type, iconClass }) => {
            it(`should show correct icon for ${type} type`, async () => {
                const notifications = [
                    {
                        id: 1,
                        title: `${type} notification`,
                        type,
                        is_read: false,
                        created_at: new Date().toISOString(),
                    },
                ];
                getNotifications.mockResolvedValue({ notifications });
                const { container } = renderComponent();

                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
                });

                const bellButton = screen.getByRole('button', { name: /notifications/i });
                fireEvent.click(bellButton);

                await waitFor(() => {
                    const icon = container.querySelector(`.${iconClass}`);
                    expect(icon).toBeInTheDocument();
                });
            });
        });
    });

    describe('time formatting', () => {
        it('should show "Just now" for recent notifications', async () => {
            const notifications = [
                {
                    id: 1,
                    title: 'Recent',
                    type: 'info',
                    is_read: false,
                    created_at: new Date().toISOString(),
                },
            ];
            getNotifications.mockResolvedValue({ notifications });
            renderComponent();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
            });

            const bellButton = screen.getByRole('button', { name: /notifications/i });
            fireEvent.click(bellButton);

            await waitFor(() => {
                expect(screen.getByText('Just now')).toBeInTheDocument();
            });
        });

        it('should show minutes ago for notifications less than an hour old', async () => {
            const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
            const notifications = [
                {
                    id: 1,
                    title: 'Test',
                    type: 'info',
                    is_read: false,
                    created_at: thirtyMinutesAgo.toISOString(),
                },
            ];
            getNotifications.mockResolvedValue({ notifications });
            renderComponent();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
            });

            const bellButton = screen.getByRole('button', { name: /notifications/i });
            fireEvent.click(bellButton);

            await waitFor(() => {
                expect(screen.getByText('30m ago')).toBeInTheDocument();
            });
        });

        it('should show hours ago for notifications less than a day old', async () => {
            const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
            const notifications = [
                {
                    id: 1,
                    title: 'Test',
                    type: 'info',
                    is_read: false,
                    created_at: fiveHoursAgo.toISOString(),
                },
            ];
            getNotifications.mockResolvedValue({ notifications });
            renderComponent();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
            });

            const bellButton = screen.getByRole('button', { name: /notifications/i });
            fireEvent.click(bellButton);

            await waitFor(() => {
                expect(screen.getByText('5h ago')).toBeInTheDocument();
            });
        });

        it('should show days ago for notifications less than a week old', async () => {
            const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
            const notifications = [
                {
                    id: 1,
                    title: 'Test',
                    type: 'info',
                    is_read: false,
                    created_at: threeDaysAgo.toISOString(),
                },
            ];
            getNotifications.mockResolvedValue({ notifications });
            renderComponent();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
            });

            const bellButton = screen.getByRole('button', { name: /notifications/i });
            fireEvent.click(bellButton);

            await waitFor(() => {
                expect(screen.getByText('3d ago')).toBeInTheDocument();
            });
        });
    });

    describe('mark as read functionality', () => {
        it('should mark notification as read when clicked', async () => {
            const notifications = [
                {
                    id: 1,
                    title: 'Unread Notification',
                    type: 'info',
                    is_read: false,
                    created_at: new Date().toISOString(),
                },
            ];
            getNotifications.mockResolvedValue({ notifications });
            getUnreadCount.mockResolvedValue({ count: 1 });
            renderComponent();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
            });

            const bellButton = screen.getByRole('button', { name: /notifications/i });
            fireEvent.click(bellButton);

            await waitFor(() => {
                expect(screen.getByText('Unread Notification')).toBeInTheDocument();
            });

            const notificationItem = screen.getByText('Unread Notification').closest('.notification-item');
            fireEvent.click(notificationItem);

            await waitFor(() => {
                expect(markAsRead).toHaveBeenCalledWith(1);
            });
        });

        it('should not call markAsRead for already read notifications', async () => {
            const notifications = [
                {
                    id: 1,
                    title: 'Read Notification',
                    type: 'info',
                    is_read: true,
                    created_at: new Date().toISOString(),
                },
            ];
            getNotifications.mockResolvedValue({ notifications });
            renderComponent();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
            });

            const bellButton = screen.getByRole('button', { name: /notifications/i });
            fireEvent.click(bellButton);

            await waitFor(() => {
                expect(screen.getByText('Read Notification')).toBeInTheDocument();
            });

            const notificationItem = screen.getByText('Read Notification').closest('.notification-item');
            fireEvent.click(notificationItem);

            expect(markAsRead).not.toHaveBeenCalled();
        });

        it('should navigate when notification has a link', async () => {
            const notifications = [
                {
                    id: 1,
                    title: 'Linked Notification',
                    type: 'info',
                    is_read: true,
                    link: '/some/path',
                    created_at: new Date().toISOString(),
                },
            ];
            getNotifications.mockResolvedValue({ notifications });
            renderComponent();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
            });

            const bellButton = screen.getByRole('button', { name: /notifications/i });
            fireEvent.click(bellButton);

            await waitFor(() => {
                expect(screen.getByText('Linked Notification')).toBeInTheDocument();
            });

            const notificationItem = screen.getByText('Linked Notification').closest('.notification-item');
            fireEvent.click(notificationItem);

            expect(mockNavigate).toHaveBeenCalledWith('/some/path');
        });
    });

    describe('mark all as read', () => {
        it('should show mark all read button when there are unread notifications', async () => {
            getUnreadCount.mockResolvedValue({ count: 3 });
            getNotifications.mockResolvedValue({ notifications: [] });
            renderComponent();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
            });

            const bellButton = screen.getByRole('button', { name: /notifications/i });
            fireEvent.click(bellButton);

            await waitFor(() => {
                expect(screen.getByText('Mark all read')).toBeInTheDocument();
            });
        });

        it('should not show mark all read button when no unread notifications', async () => {
            getUnreadCount.mockResolvedValue({ count: 0 });
            getNotifications.mockResolvedValue({ notifications: [] });
            renderComponent();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
            });

            const bellButton = screen.getByRole('button', { name: /notifications/i });
            fireEvent.click(bellButton);

            await waitFor(() => {
                expect(screen.getByText('No notifications')).toBeInTheDocument();
            });

            expect(screen.queryByText('Mark all read')).not.toBeInTheDocument();
        });

        it('should call markAllAsRead when button is clicked', async () => {
            getUnreadCount.mockResolvedValue({ count: 3 });
            getNotifications.mockResolvedValue({ notifications: [] });
            renderComponent();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
            });

            const bellButton = screen.getByRole('button', { name: /notifications/i });
            fireEvent.click(bellButton);

            await waitFor(() => {
                expect(screen.getByText('Mark all read')).toBeInTheDocument();
            });

            const markAllButton = screen.getByText('Mark all read');
            fireEvent.click(markAllButton);

            await waitFor(() => {
                expect(markAllAsRead).toHaveBeenCalled();
            });
        });
    });

    describe('WebSocket integration', () => {
        it('should register socket listeners when connected', async () => {
            renderComponent();

            await waitFor(() => {
                expect(mockSocket.on).toHaveBeenCalledWith('notification:new', expect.any(Function));
                expect(mockSocket.on).toHaveBeenCalledWith('notification:read', expect.any(Function));
            });
        });

        it('should handle new notification event', async () => {
            getUnreadCount.mockResolvedValue({ count: 0 });
            getNotifications.mockResolvedValue({ notifications: [] });

            renderComponent();

            await waitFor(() => {
                expect(mockSocket.on).toHaveBeenCalledWith('notification:new', expect.any(Function));
            });

            // Get the handler that was registered
            const newNotificationHandler = mockSocket.on.mock.calls.find(
                (call) => call[0] === 'notification:new'
            )[1];

            // Simulate receiving a new notification
            act(() => {
                newNotificationHandler({
                    id: 99,
                    title: 'New Socket Notification',
                    type: 'info',
                    is_read: false,
                    created_at: new Date().toISOString(),
                });
            });

            // Unread count should have increased
            await waitFor(() => {
                expect(screen.getByText('1')).toBeInTheDocument();
            });
        });

        it('should handle notification read event for single notification', async () => {
            const notifications = [
                { id: 1, title: 'Test', type: 'info', is_read: false, created_at: new Date().toISOString() },
            ];
            getUnreadCount.mockResolvedValue({ count: 1 });
            getNotifications.mockResolvedValue({ notifications });

            renderComponent();

            await waitFor(() => {
                expect(mockSocket.on).toHaveBeenCalledWith('notification:read', expect.any(Function));
            });

            // Get the handler
            const readHandler = mockSocket.on.mock.calls.find(
                (call) => call[0] === 'notification:read'
            )[1];

            // Simulate notification being marked as read
            act(() => {
                readHandler({ notificationId: 1 });
            });

            // Badge should be gone (count 0)
            await waitFor(() => {
                expect(screen.queryByText('1')).not.toBeInTheDocument();
            });
        });

        it('should handle mark all as read event', async () => {
            getUnreadCount.mockResolvedValue({ count: 5 });
            getNotifications.mockResolvedValue({ notifications: [] });

            renderComponent();

            await waitFor(() => {
                expect(mockSocket.on).toHaveBeenCalledWith('notification:read', expect.any(Function));
            });

            // Get the handler
            const readHandler = mockSocket.on.mock.calls.find(
                (call) => call[0] === 'notification:read'
            )[1];

            // Simulate all notifications being marked as read
            act(() => {
                readHandler({ notificationId: 'all' });
            });

            // Badge should be gone
            await waitFor(() => {
                expect(screen.queryByText('5')).not.toBeInTheDocument();
            });
        });
    });

    describe('click outside handling', () => {
        it('should close dropdown when clicking outside', async () => {
            getNotifications.mockResolvedValue({ notifications: [] });
            renderComponent();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
            });

            // Open dropdown
            const bellButton = screen.getByRole('button', { name: /notifications/i });
            fireEvent.click(bellButton);

            await waitFor(() => {
                expect(screen.getByText('Notifications')).toBeInTheDocument();
            });

            // Click outside
            fireEvent.mouseDown(document.body);

            await waitFor(() => {
                expect(screen.queryByText(/^Notifications$/)).not.toBeInTheDocument();
            });
        });
    });

    describe('mobile responsiveness', () => {
        it('should set isMobile true when window width is less than 992', async () => {
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 768,
            });

            getNotifications.mockResolvedValue({ notifications: [] });
            renderComponent();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
            });

            const bellButton = screen.getByRole('button', { name: /notifications/i });
            fireEvent.click(bellButton);

            // The dropdown should render with mobile positioning
            await waitFor(() => {
                expect(screen.getByText('Notifications')).toBeInTheDocument();
            });
        });

        it('should handle window resize', async () => {
            getNotifications.mockResolvedValue({ notifications: [] });
            renderComponent();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
            });

            // Simulate resize
            act(() => {
                Object.defineProperty(window, 'innerWidth', { value: 500 });
                window.dispatchEvent(new Event('resize'));
            });

            const bellButton = screen.getByRole('button', { name: /notifications/i });
            fireEvent.click(bellButton);

            await waitFor(() => {
                expect(screen.getByText('Notifications')).toBeInTheDocument();
            });
        });
    });

    describe('error handling', () => {
        it('should handle getUnreadCount error gracefully', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            getUnreadCount.mockRejectedValue(new Error('Network error'));
            renderComponent();

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch unread count:', expect.any(Error));
            });

            consoleSpy.mockRestore();
        });

        it('should handle getNotifications error gracefully', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            getNotifications.mockRejectedValue(new Error('Network error'));
            renderComponent();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
            });

            const bellButton = screen.getByRole('button', { name: /notifications/i });
            fireEvent.click(bellButton);

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch notifications:', expect.any(Error));
            });

            consoleSpy.mockRestore();
        });

        it('should handle markAsRead error gracefully', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const notifications = [
                { id: 1, title: 'Test', type: 'info', is_read: false, created_at: new Date().toISOString() },
            ];
            getNotifications.mockResolvedValue({ notifications });
            getUnreadCount.mockResolvedValue({ count: 1 });
            markAsRead.mockRejectedValue(new Error('Network error'));

            renderComponent();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
            });

            const bellButton = screen.getByRole('button', { name: /notifications/i });
            fireEvent.click(bellButton);

            await waitFor(() => {
                expect(screen.getByText('Test')).toBeInTheDocument();
            });

            const notificationItem = screen.getByText('Test').closest('.notification-item');
            fireEvent.click(notificationItem);

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith('Failed to mark notification as read:', expect.any(Error));
            });

            consoleSpy.mockRestore();
        });

        it('should handle markAllAsRead error gracefully', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            getUnreadCount.mockResolvedValue({ count: 3 });
            getNotifications.mockResolvedValue({ notifications: [] });
            markAllAsRead.mockRejectedValue(new Error('Network error'));

            renderComponent();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
            });

            const bellButton = screen.getByRole('button', { name: /notifications/i });
            fireEvent.click(bellButton);

            await waitFor(() => {
                expect(screen.getByText('Mark all read')).toBeInTheDocument();
            });

            const markAllButton = screen.getByText('Mark all read');
            fireEvent.click(markAllButton);

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith('Failed to mark all as read:', expect.any(Error));
            });

            consoleSpy.mockRestore();
        });
    });

    describe('unread indicator', () => {
        it('should show unread dot for unread notifications', async () => {
            const notifications = [
                { id: 1, title: 'Unread', type: 'info', is_read: false, created_at: new Date().toISOString() },
            ];
            getNotifications.mockResolvedValue({ notifications });
            const { container } = renderComponent();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
            });

            const bellButton = screen.getByRole('button', { name: /notifications/i });
            fireEvent.click(bellButton);

            await waitFor(() => {
                const unreadDot = container.querySelector('.unread-dot');
                expect(unreadDot).toBeInTheDocument();
            });
        });

        it('should apply unread class to unread notification items', async () => {
            const notifications = [
                { id: 1, title: 'Unread', type: 'info', is_read: false, created_at: new Date().toISOString() },
            ];
            getNotifications.mockResolvedValue({ notifications });
            renderComponent();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
            });

            const bellButton = screen.getByRole('button', { name: /notifications/i });
            fireEvent.click(bellButton);

            await waitFor(() => {
                const notificationItem = screen.getByText('Unread').closest('.notification-item');
                expect(notificationItem).toHaveClass('unread');
            });
        });
    });

    describe('cleanup', () => {
        it('should remove event listeners on unmount', async () => {
            const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
            const { unmount } = renderComponent();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
            });

            unmount();

            expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
            removeEventListenerSpy.mockRestore();
        });

        it('should unregister socket listeners on unmount', async () => {
            const { unmount } = renderComponent();

            await waitFor(() => {
                expect(mockSocket.on).toHaveBeenCalled();
            });

            unmount();

            expect(mockSocket.off).toHaveBeenCalledWith('notification:new', expect.any(Function));
            expect(mockSocket.off).toHaveBeenCalledWith('notification:read', expect.any(Function));
        });
    });
});
