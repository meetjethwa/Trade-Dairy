const Trade = require('../models/Trade');

// @desc    Get all trades for logged in user
// @route   GET /api/trades
const getTrades = async (req, res) => {
  try {
    const trades = await Trade.find({ user: req.user._id }).sort({ date: -1 });
    res.json(trades);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create a trade
// @route   POST /api/trades
const createTrade = async (req, res) => {
  try {
    const { symbol, market, direction, entryPrice, exitPrice, quantity, leverage, date, exitDate, strategy, notes, brokerage } = req.body;

    if (!symbol || !entryPrice || !exitPrice || !quantity) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    const trade = await Trade.create({
      user: req.user._id,
      symbol,
      market,
      direction,
      entryPrice,
      exitPrice,
      quantity,
      leverage,
      date,
      exitDate,
      strategy,
      notes,
      brokerage,
    });

    res.status(201).json(trade);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update a trade
// @route   PUT /api/trades/:id
const updateTrade = async (req, res) => {
  try {
    const trade = await Trade.findById(req.params.id);

    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    if (trade.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const updated = await Trade.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a trade
// @route   DELETE /api/trades/:id
const deleteTrade = async (req, res) => {
  try {
    const trade = await Trade.findById(req.params.id);

    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    if (trade.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await trade.deleteOne();
    res.json({ message: 'Trade removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getTrades, createTrade, updateTrade, deleteTrade };
