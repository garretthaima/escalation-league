import React from 'react';

export const Link = ({ children, to, ...props }) => (
    <a href={to} {...props}>{children}</a>
);

export const NavLink = ({ children, to, ...props }) => (
    <a href={to} {...props}>{children}</a>
);

export const useNavigate = () => jest.fn();
export const useLocation = () => ({ pathname: '/', search: '', hash: '' });
export const useParams = () => ({});
export const useSearchParams = () => [new URLSearchParams(), jest.fn()];

export const BrowserRouter = ({ children }) => <>{children}</>;
export const Routes = ({ children }) => <>{children}</>;
export const Route = () => null;
export const Navigate = () => null;
export const Outlet = () => null;
