const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const M3UParser = require('../services/m3uParser');
const NodeCache = require('node-cache');

// Cache for 1 hour
const cache = new NodeCache({ stdTTL: 3600 });

// GET /api/channels - Get all channels with optional filtering
router.get('/', async (req, res) => {
  try {
    const { category, country, language, limit = 100, offset = 0 } = req.query;
    
    const cacheKey = `channels_${category}_${country}_${language}_${limit}_${offset}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    let query = supabase
      .from('channels')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('name', { ascending: true });

    if (category && category !== 'All') {
      query = query.ilike('category', `%${category}%`);
    }
    if (country) {
      query = query.ilike('country', `%${country}%`);
    }
    if (language) {
      query = query.ilike('language', `%${language}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    cache.set(cacheKey, data);

    res.json({
      success: true,
      data: data || [],
      total: count,
      cached: false
    });

  } catch (error) {
    console.error('❌ Error fetching channels:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/channels/search - Search channels
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({ 
        success: false, 
        error: 'Search query must be at least 2 characters' 
      });
    }

    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .ilike('name', `%${q}%`)
      .limit(50);

    if (error) throw error;

    res.json({ success: true, data: data || [] });

  } catch (error) {
    console.error('❌ Search error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/channels/categories - Get all unique categories
router.get('/categories', async (req, res) => {
  try {
    const cached = cache.get('categories');
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const { data, error } = await supabase
      .from('channels')
      .select('category')
      .not('category', 'is', null);

    if (error) throw error;

    const categories = [...new Set(data.map(item => item.category))].sort();
    cache.set('categories', categories);

    res.json({ success: true, data: categories, cached: false });

  } catch (error) {
    console.error('❌ Error fetching categories:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/channels/refresh - Manually refresh channel list (admin)
router.post('/refresh', async (req, res) => {
  try {
    const parser = new M3UParser();
    const channels = await parser.fetchAndParse();
    
    cache.flushAll(); // Clear all cache

    res.json({ 
      success: true, 
      message: `Successfully refreshed ${channels.length} channels` 
    });

  } catch (error) {
    console.error('❌ Refresh error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;