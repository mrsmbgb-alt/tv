const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initDatabase } = require('./config/supabase');
const channelsRouter = require('./routes/channels');
const epgRouter = require('./routes/epg');
const favoritesRouter = require('./routes/favorites');
const M3UParser = require('./services/m3uParser');
const EPGParser = require('./services/epgParser');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/channels', channelsRouter);
app.use('/api/epg', epgRouter);
app.use('/api/favorites', favoritesRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '📺 IPTV Aggregator API',
    version: '1.0.0',
    endpoints: {
      channels: '/api/channels',
      search: '/api/channels/search?q=query',
      categories: '/api/channels/categories',
      epg: '/api/epg?channel=name',
      favorites: '/api/favorites/:userId',
      health: '/health'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Initialize and start server
const startServer = async () => {
  try {
    // Initialize database
    await initDatabase();

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 API URL: http://localhost:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Initial data fetch (run once on startup)
    setTimeout(async () => {
      try {
        console.log('🔄 Starting initial data sync...');
        
        const m3uParser = new M3UParser();
        await m3uParser.fetchAndParse();
        
        // Uncomment if EPG source is available
        // const epgParser = new EPGParser();
        // await epgParser.fetchAndParse();
        
        console.log('✅ Initial data sync completed');
      } catch (error) {
        console.error('❌ Initial sync error:', error.message);
      }
    }, 5000);

    // Scheduled refresh every 6 hours
    setInterval(async () => {
      try {
        console.log('🔄 Running scheduled refresh...');
        const m3uParser = new M3UParser();
        await m3uParser.fetchAndParse();
      } catch (error) {
        console.error('❌ Scheduled refresh error:', error.message);
      }
    }, 6 * 60 * 60 * 1000);

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;