// Utility function for error handling
const handleError = (res, error, statusCode = 500, message = 'Internal server error') => {
    console.error(error);
    res.status(statusCode).json({ error: message });
};

module.exports = { handleError };