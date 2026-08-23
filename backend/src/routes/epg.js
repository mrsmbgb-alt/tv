const express = require('express');
const router = express.Router();
const EPGParser = require('../services/epgParser');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 1800 }); // 30 minutes cache

// GET /api/epg?channel=channel_name
router.get('/', async (req, res) => {
  try {
    const { channel } = req.query;

    if (!channel) {
      return res.status(400).json({ 
        success: false, 
        error: 'Channel name is required' 
      });
    }

    const cacheKey = `epg_${channel}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const epgParser = new EPGParser();
    const programs = await epgParser.getEPGForChannel(channel);

    cache.set(cacheKey, programs);

    res.json({ success: true, data: programs, cached: false });

  } catch (error) {
    console.error('❌ EPG fetch error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/epg/refresh - Refresh EPG data (admin)
router.post('/refresh', async (req, res) => {
  try {
    const epgParser = new EPGParser();
    await epgParser.fetchAndParse();
    
    cache.flushAll();

    res.json({ success: true, message: 'EPG data refreshed successfully' });

  } catch (error) {
    console.error('❌ EPG refresh error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;