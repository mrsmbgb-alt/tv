const axios = require('axios');
const { supabase } = require('../config/supabase');

class M3UParser {
  constructor(playlistUrl) {
    this.playlistUrl = playlistUrl || process.env.M3U_PLAYLIST_URL;
  }

  async fetchAndParse() {
    try {
      console.log('📥 Fetching M3U playlist...');
      const response = await axios.get(this.playlistUrl, {
        timeout: 30000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      const channels = this.parseM3U(response.data);
      console.log(`✅ Parsed ${channels.length} channels`);

      await this.saveToDatabase(channels);
      return channels;

    } catch (error) {
      console.error('❌ M3U parsing error:', error.message);
      throw error;
    }
  }

  parseM3U(content) {
    const lines = content.split('\n');
    const channels = [];
    let currentChannel = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#EXTINF:')) {
        // Parse channel metadata
        const nameMatch = line.match(/,(.+)$/);
        const logoMatch = line.match(/tvg-logo="([^"]+)"/);
        const groupMatch = line.match(/group-title="([^"]+)"/);
        const countryMatch = line.match(/tvg-country="([^"]+)"/);
        const langMatch = line.match(/tvg-language="([^"]+)"/);

        currentChannel = {
          name: nameMatch ? nameMatch[1].trim() : 'Unknown',
          logo_url: logoMatch ? logoMatch[1] : this.generatePlaceholderLogo(nameMatch ? nameMatch[1] : 'TV'),
          category: groupMatch ? groupMatch[1].trim() : 'General',
          country: countryMatch ? countryMatch[1].trim() : 'Unknown',
          language: langMatch ? langMatch[1].trim() : 'Unknown'
        };

      } else if (line && !line.startsWith('#') && currentChannel.name) {
        // Stream URL
        currentChannel.stream_url = line;
        channels.push({ ...currentChannel });
        currentChannel = {};
      }
    }

    return channels.filter(ch => ch.stream_url && ch.stream_url.startsWith('http'));
  }

  generatePlaceholderLogo(name) {
    const initial = name.charAt(0).toUpperCase();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=e94560&color=fff&size=200&bold=true`;
  }

  async saveToDatabase(channels) {
    try {
      console.log('💾 Saving channels to database...');
      
      // Batch insert in chunks of 100
      const chunkSize = 100;
      for (let i = 0; i < channels.length; i += chunkSize) {
        const chunk = channels.slice(i, i + chunkSize);
        
        const { error } = await supabase
          .from('channels')
          .upsert(chunk, { 
            onConflict: 'stream_url',
            ignoreDuplicates: false 
          });

        if (error) {
          console.error(`❌ Error saving chunk ${i / chunkSize + 1}:`, error.message);
        } else {
          console.log(`✅ Saved chunk ${i / chunkSize + 1}/${Math.ceil(channels.length / chunkSize)}`);
        }
      }

      console.log('✅ All channels saved to database');
    } catch (error) {
      console.error('❌ Database save error:', error.message);
      throw error;
    }
  }
}

module.exports = M3UParser;