const Bottleneck = require('bottleneck');

// Create a rate limiter for Moxfield API
const moxfieldLimiter = new Bottleneck({
    minTime: 1000, // 1 request per second
});

module.exports = {
    moxfieldLimiter,
};