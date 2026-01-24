import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useWebSocket } from '../../context/WebSocketProvider';
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from '../../api/notificationsApi';
import './NotificationCenter.css';

const NotificationCenter = () => {
    const navigate = useNavigate();
    const { socket, connected } = useWebSocket();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const bellRef = useRef(null);
    const dropdownRef = useRef(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 992);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 992);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Fetch initial data
    const fetchNotifications = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getNotifications(10, 0);
            setNotifications(data.notifications || []);
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchUnreadCount = useCallback(async () => {
        try {
            const data = await getUnreadCount();
            setUnreadCount(data.count || 0);
        } catch (err) {
            console.error('Failed to fetch unread count:', err);
        }
    }, []);

    // Fetch on mount
    useEffect(() => {
        fetchUnreadCount();
    }, [fetchUnreadCount]);

    // Fetch notifications when dropdown opens
    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen, fetchNotifications]);

    // WebSocket listeners for real-time updates
    useEffect(() => {
        if (socket && connected) {
            const handleNewNotification = (notification) => {
                setNotifications(prev => [notification, ...prev.slice(0, 9)]);
                setUnreadCount(prev => prev + 1);
            };

            const handleNotificationRead = ({ notificationId }) => {
                if (notificationId === 'all') {
                    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                    setUnreadCount(0);
                } else {
                    setNotifications(prev => prev.map(n =>
                        n.id === notificationId ? { ...n, is_read: true } : n
                    ));
                    setUnreadCount(prev => Math.max(0, prev - 1));
                }
            };

            socket.on('notification:new', handleNewNotification);
            socket.on('notification:read', handleNotificationRead);

            return () => {
                socket.off('notification:new', handleNewNotification);
                socket.off('notification:read', handleNotificationRead);
            };
        }
    }, [socket, connected]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (bellRef.current && !bellRef.current.contains(event.target) &&
                dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleBellClick = () => {
        setIsOpen(!isOpen);
    };

    const handleNotificationClick = async (notification) => {
        // Mark as read if unread
        if (!notification.is_read) {
            try {
                await markAsRead(notification.id);
                setNotifications(prev => prev.map(n =>
                    n.id === notification.id ? { ...n, is_read: true } : n
                ));
                setUnreadCount(prev => Math.max(0, prev - 1));
            } catch (err) {
                console.error('Failed to mark notification as read:', err);
            }
        }

        // Navigate if link exists
        if (notification.link) {
            setIsOpen(false);
            navigate(notification.link);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'success': return 'fa-check-circle text-success';
            case 'warning': return 'fa-exclamation-triangle text-warning';
            case 'error': return 'fa-times-circle text-danger';
            default: return 'fa-info-circle text-info';
        }
    };

    return (
        <>
            <div className="notification-bell" ref={bellRef}>
                <button
                    className="btn p-0 border-0 bg-transparent notification-bell-btn"
                    type="button"
                    onClick={handleBellClick}
                    aria-label="Notifications"
                >
                    <i className="fas fa-bell"></i>
                    {unreadCount > 0 && (
                        <span className="notification-badge">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </button>
            </div>

            {isOpen && createPortal(
                <div
                    ref={dropdownRef}
                    className="notification-dropdown"
                    style={{
                        position: 'fixed',
                        top: isMobile ? '56px' : '70px',
                        right: isMobile ? '10px' : '60px',
                        zIndex: 99999,
                    }}
                >
                    <div className="notification-header">
                        <span className="notification-title">Notifications</span>
                        {unreadCount > 0 && (
                            <button
                                className="btn btn-link btn-sm mark-all-read"
                                onClick={handleMarkAllRead}
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="notification-list">
                        {loading ? (
                            <div className="notification-empty">
                                <i className="fas fa-spinner fa-spin"></i>
                                <span>Loading...</span>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="notification-empty">
                                <i className="fas fa-bell-slash"></i>
                                <span>No notifications</span>
                            </div>
                        ) : (
                            notifications.map(notification => (
                                <div
                                    key={notification.id}
                                    className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="notification-icon">
                                        <i className={`fas ${getTypeIcon(notification.type)}`}></i>
                                    </div>
                                    <div className="notification-content">
                                        <div className="notification-item-title">{notification.title}</div>
                                        {notification.message && (
                                            <div className="notification-message">{notification.message}</div>
                                        )}
                                        <div className="notification-time">{formatTime(notification.created_at)}</div>
                                    </div>
                                    {!notification.is_read && <div className="unread-dot"></div>}
                                </div>
                            ))
                        )}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default NotificationCenter;
