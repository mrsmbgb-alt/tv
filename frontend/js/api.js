// API Configuration
const API_CONFIG = {
    BASE_URL: 'https://your-backend.onrender.com', // REPLACE WITH YOUR RENDER URL
    ENDPOINTS: {
        CHANNELS: '/api/channels',
        SEARCH: '/api/channels/search',
        CATEGORIES: '/api/channels/categories',
        EPG: '/api/epg',
        FAVORITES: '/api/favorites'
    }
};

// API Service
const API = {
    // Get all channels with filters
    async getChannels(params = {}) {
        try {
            const queryString = new URLSearchParams(params).toString();
            const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CHANNELS}?${queryString}`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch channels');
            }
            
            return data.data;
        } catch (error) {
            console.error('API Error (getChannels):', error);
            return [];
        }
    },

    // Search channels
    async searchChannels(query) {
        try {
            const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SEARCH}?q=${encodeURIComponent(query)}`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Search failed');
            }
            
            return data.data;
        } catch (error) {
            console.error('API Error (searchChannels):', error);
            return [];
        }
    },

    // Get categories
    async getCategories() {
        try {
            const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch categories');
            }
            
            return data.data;
        } catch (error) {
            console.error('API Error (getCategories):', error);
            return [];
        }
    },

    // Get EPG for channel
    async getEPG(channelName) {
        try {
            const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EPG}?channel=${encodeURIComponent(channelName)}`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch EPG');
            }
            
            return data.data;
        } catch (error) {
            console.error('API Error (getEPG):', error);
            return [];
        }
    }
};

// Local Storage Manager
const Storage = {
    // Get user ID (generate if doesn't exist)
    getUserId() {
        let userId = localStorage.getItem('userId');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('userId', userId);
        }
        return userId;
    },

    // Get favorites
    getFavorites() {
        const favorites = localStorage.getItem('favorites');
        return favorites ? JSON.parse(favorites) : [];
    },

    // Add to favorites
    addFavorite(channel) {
        const favorites = this.getFavorites();
        const exists = favorites.find(fav => fav.id === channel.id);
        
        if (!exists) {
            favorites.push(channel);
            localStorage.setItem('favorites', JSON.stringify(favorites));
        }
        
        return favorites;
    },

    // Remove from favorites
    removeFavorite(channelId) {
        let favorites = this.getFavorites();
        favorites = favorites.filter(fav => fav.id !== channelId);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        return favorites;
    },

    // Check if channel is favorite
    isFavorite(channelId) {
        const favorites = this.getFavorites();
        return favorites.some(fav => fav.id === channelId);
    },

    // Get last watched channel
    getLastWatched() {
        const lastWatched = localStorage.getItem('lastWatched');
        return lastWatched ? JSON.parse(lastWatched) : null;
    },

    // Set last watched channel
    setLastWatched(channel) {
        localStorage.setItem('lastWatched', JSON.stringify(channel));
    }
};