const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');

// 10.9 Fetch Static CMS Pages
router.get('/:page_key', supportController.getStaticPage);

module.exports = router;
