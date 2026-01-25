import React from 'react';
import PropTypes from 'prop-types';

/**
 * Button component with built-in loading state
 * Shows a spinner and loading text when loading prop is true
 */
const LoadingButton = ({
    loading = false,
    onClick,
    children,
    loadingText = 'Loading...',
    icon,
    variant = 'primary',
    className = '',
    disabled = false,
    type = 'button',
    style,
    ...props
}) => {
    const isDisabled = loading || disabled;

    return (
        <button
            type={type}
            className={`btn btn-${variant} ${className}`}
            onClick={onClick}
            disabled={isDisabled}
            style={style}
            {...props}
        >
            {loading ? (
                <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                    {loadingText}
                </>
            ) : (
                <>
                    {icon && <i className={`${icon} me-2`} />}
                    {children}
                </>
            )}
        </button>
    );
};

LoadingButton.propTypes = {
    loading: PropTypes.bool,
    onClick: PropTypes.func,
    children: PropTypes.node.isRequired,
    loadingText: PropTypes.string,
    icon: PropTypes.string,
    variant: PropTypes.string,
    className: PropTypes.string,
    disabled: PropTypes.bool,
    type: PropTypes.oneOf(['button', 'submit', 'reset']),
    style: PropTypes.object
};

export default LoadingButton;
