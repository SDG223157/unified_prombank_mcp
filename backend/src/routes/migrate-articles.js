const express = require('express');
const { addArticlesTable } = require('../migrations/add-articles-table');

const router = express.Router();

// Temporary migration endpoint for articles table - REMOVE AFTER USE
router.post('/add-articles-table', async (req, res) => {
  try {
    const result = await addArticlesTable();
    res.json(result);
  } catch (error) {
    console.error('❌ Articles migration failed:', error);
    res.status(500).json({
      success: false,
      error: 'Migration Failed',
      message: error.message,
      details: error.stack
    });
  }
});

module.exports = router;
