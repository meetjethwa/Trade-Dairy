const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  symbol: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
  },
  market: {
    type: String,
    required: true,
    enum: ['Stocks', 'Crypto', 'Forex', 'Futures', 'Options', 'Commodities'],
    default: 'Stocks',
  },
  direction: {
    type: String,
    required: true,
    enum: ['Long', 'Short'],
    default: 'Long',
  },
  entryPrice: {
    type: Number,
    required: true,
  },
  exitPrice: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  leverage: {
    type: Number,
    min: 1,
    default: 1,
  },
  brokerage: {
    type: Number,
    min: 0,
    default: 0,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  exitDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  strategy: {
    type: String,
    trim: true,
    default: '',
  },
  notes: {
    type: String,
    trim: true,
    default: '',
  },
}, { timestamps: true });

module.exports = mongoose.model('Trade', tradeSchema);
