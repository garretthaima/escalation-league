const Bottleneck = require('bottleneck');

// Create a rate limiter for Moxfield API
const moxfieldLimiter = new Bottleneck({
    minTime: 1000, // 1 request per second
});

// Rate limiter for Archidekt
const archidektLimiter = new Bottleneck({
    maxConcurrent: 1, // Allow 1 request at a time
    minTime: 1000, // Wait at least 1 second between requests
});

module.exports = {
    moxfieldLimiter,
    archidektLimiter,
};