const express = require('express');
const { submitContactForm } = require('../controllers/contactController');
const router = express.Router();

// POST route for submitting contact form data
router.post('/', submitContactForm);  // Now this will be under /api/contact

module.exports = router;
