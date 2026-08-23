const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');

// GET /api/favorites/:userId - Get user's favorites
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('favorites')
      .select(`
        *,
        channels (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data: data || [] });

  } catch (error) {
    console.error('❌ Error fetching favorites:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/favorites - Add to favorites
router.post('/', async (req, res) => {
  try {
    const { userId, channelId } = req.body;

    if (!userId || !channelId) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId and channelId are required' 
      });
    }

    const { data, error } = await supabase
      .from('favorites')
      .insert({ user_id: userId, channel_id: channelId })
      .select();

    if (error) {
      if (error.code === '23505') { // Duplicate
        return res.status(409).json({ 
          success: false, 
          error: 'Already in favorites' 
        });
      }
      throw error;
    }

    res.json({ success: true, data: data[0] });

  } catch (error) {
    console.error('❌ Error adding favorite:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/favorites/:userId/:channelId - Remove from favorites
router.delete('/:userId/:channelId', async (req, res) => {
  try {
    const { userId, channelId } = req.params;

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('channel_id', channelId);

    if (error) throw error;

    res.json({ success: true, message: 'Removed from favorites' });

  } catch (error) {
    console.error('❌ Error removing favorite:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;