const express = require('express');
const router = express.Router();
const { createPod, joinPod, logPodResult } = require('../controllers/podsController');
const authenticateToken = require('../middlewares/authentication');

// Pod Management Endpoints
router.post('/', authenticateToken, createPod); // Create a pod
router.post('/:podId/join', authenticateToken, joinPod); // Join a pod
router.post('/:podId/log', authenticateToken, logPodResult); // Log pod result

module.exports = router;