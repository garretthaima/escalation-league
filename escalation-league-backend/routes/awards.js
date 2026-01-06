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

// All routes require authentication
router.use(authentication);

// Award CRUD operations (requires award_manage permission)
router.get('/', getAwards); // Anyone can view awards
router.get('/:awardId', getAward); // Anyone can view single award
router.post('/', authorizePermission('award_manage'), createAward);
router.put('/:awardId', authorizePermission('award_manage'), updateAward);
router.delete('/:awardId', authorizePermission('award_manage'), deleteAward);

// League-specific awards
router.get('/league/:leagueId', getLeagueAwards); // Anyone can view league awards

// Give/remove awards to users (requires award_manage permission)
router.post('/give', authorizePermission('award_manage'), giveAward);
router.delete('/user-award/:userAwardId', authorizePermission('award_manage'), removeAward);

module.exports = router;
