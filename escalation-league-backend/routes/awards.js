const express = require('express');
const router = express.Router();
const {
    getAwards,
    getAward,
    createAward,
    updateAward,
    deleteAward,
    getLeagueAwards,
    giveAward,
    removeAward
} = require('../controllers/awardsController');
const authentication = require('../middlewares/authentication');
const authorizePermission = require('../middlewares/authorizePermission');
const { cacheMiddleware, CACHE_TTL } = require('../middlewares/cacheMiddleware');

// All routes require authentication
router.use(authentication);

// Award CRUD operations (requires award_manage permission)
router.get('/', cacheMiddleware(CACHE_TTL.LONG), getAwards); // Cache for 15 minutes
router.get('/:awardId', cacheMiddleware(CACHE_TTL.LONG), getAward); // Cache for 15 minutes
router.post('/', authorizePermission('award_manage'), createAward);
router.put('/:awardId', authorizePermission('award_manage'), updateAward);
router.delete('/:awardId', authorizePermission('award_manage'), deleteAward);

// League-specific awards
router.get('/league/:leagueId', cacheMiddleware(CACHE_TTL.MEDIUM), getLeagueAwards); // Cache for 5 minutes

// Give/remove awards to users (requires award_manage permission)
router.post('/give', authorizePermission('award_manage'), giveAward);
router.delete('/user-award/:userAwardId', authorizePermission('award_manage'), removeAward);

module.exports = router;
