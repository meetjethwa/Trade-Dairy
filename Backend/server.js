const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

const authRoutes = require('./Routes/authRoutes');
const tradeRoutes = require('./Routes/tradeRoutes');
const errorHandler = require('./middleware/errorHandler');

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// CORS
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true
  })
);

// Body parser
app.use(
  express.json({
    limit: '2mb'
  })
);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/trades', tradeRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({
    message: 'TradeDiary API running'
  });
});

// Error handler
app.use(errorHandler);

// Port
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});