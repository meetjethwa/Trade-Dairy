const express = require('express');
const router = express.Router();
const { getTrades, createTrade, updateTrade, deleteTrade } = require('../Controllers/tradeController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getTrades)
  .post(protect, createTrade);

router.route('/:id')
  .put(protect, updateTrade)
  .delete(protect, deleteTrade);

module.exports = router;