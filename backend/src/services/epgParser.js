const axios = require('axios');
const xml2js = require('xml2js');
const { supabase } = require('../config/supabase');

class EPGParser {
  constructor(epgUrl) {
    this.epgUrl = epgUrl || process.env.EPG_SOURCE_URL;
    this.parser = new xml2js.Parser();
  }

  async fetchAndParse() {
    try {
      console.log('📺 Fetching EPG data...');
      const response = await axios.get(this.epgUrl, {
        timeout: 60000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      const epgData = await this.parseXML(response.data);
      console.log(`✅ Parsed EPG data for ${epgData.length} programs`);

      await this.saveToDatabase(epgData);
      return epgData;

    } catch (error) {
      console.error('❌ EPG parsing error:', error.message);
      return [];
    }
  }

  async parseXML(xmlContent) {
    try {
      const result = await this.parser.parseStringPromise(xmlContent);
      const programs = [];

      if (result.tv && result.tv.programme) {
        for (const prog of result.tv.programme.slice(0, 5000)) { // Limit to 5000 programs
          const title = prog.title?.[0]?._ || prog.title?.[0] || 'No Title';
          const desc = prog.desc?.[0]?._ || prog.desc?.[0] || '';
          
          programs.push({
            channel_name: prog.$.channel,
            title: title,
            start_time: this.parseEPGTime(prog.$.start),
            end_time: this.parseEPGTime(prog.$.stop),
            description: desc.substring(0, 500) // Limit description length
          });
        }
      }

      return programs;
    } catch (error) {
      console.error('❌ XML parsing error:', error.message);
      return [];
    }
  }

  parseEPGTime(timeStr) {
    // EPG time format: YYYYMMDDHHmmss +0000
    if (!timeStr) return null;
    
    const year = timeStr.substring(0, 4);
    const month = timeStr.substring(4, 6);
    const day = timeStr.substring(6, 8);
    const hour = timeStr.substring(8, 10);
    const minute = timeStr.substring(10, 12);
    const second = timeStr.substring(12, 14);

    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
  }

  async saveToDatabase(programs) {
    try {
      console.log('💾 Saving EPG data to database...');

      // Clear old EPG data (older than 24 hours)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await supabase
        .from('epg_data')
        .delete()
        .lt('end_time', yesterday.toISOString());

      // Batch insert
      const chunkSize = 100;
      for (let i = 0; i < programs.length; i += chunkSize) {
        const chunk = programs.slice(i, i + chunkSize);
        
        const { error } = await supabase
          .from('epg_data')
          .insert(chunk);

        if (error && !error.message.includes('duplicate')) {
          console.error(`❌ Error saving EPG chunk:`, error.message);
        }
      }

      console.log('✅ EPG data saved to database');
    } catch (error) {
      console.error('❌ EPG database save error:', error.message);
    }
  }

  async getEPGForChannel(channelName) {
    try {
      const now = new Date();
      
      const { data, error } = await supabase
        .from('epg_data')
        .select('*')
        .eq('channel_name', channelName)
        .gte('end_time', now.toISOString())
        .order('start_time', { ascending: true })
        .limit(20);

      if (error) throw error;
      return data || [];
      
    } catch (error) {
      console.error('❌ EPG fetch error:', error.message);
      return [];
    }
  }
}

module.exports = EPGParser;