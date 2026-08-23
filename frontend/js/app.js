// Main Application
class IPTVApp {
    constructor() {
        this.channels = [];
        this.filteredChannels = [];
        this.currentCategory = 'All';
        this.currentCountry = '';
        this.offset = 0;
        this.limit = 50;
        this.player = new VideoPlayer('videoPlayer');
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing IPTV App...');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load channels
        await this.loadChannels();
        
        // Load favorites count
        this.updateFavoritesCount();
        
        // Load last watched channel
        this.loadLastWatched();
        
        console.log('✅ App initialized');
    }

    setupEventListeners() {
        // Search
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        
        let searchTimeout;
        searchInput?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.handleSearch(e.target.value);
            }, 500);
        });
        
        searchBtn?.addEventListener('click', () => {
            this.handleSearch(searchInput.value);
        });

        // Category filters
        document.getElementById('categoryFilters')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('category-btn')) {
                this.handleCategoryFilter(e.target);
            }
        });

        // Country filters
        document.getElementById('countryFilters')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('category-btn')) {
                this.handleCountryFilter(e.target);
            }
        });

        // Refresh button
        document.getElementById('refreshBtn')?.addEventListener('click', () => {
            this.loadChannels(true);
        });

        // Load more
        document.getElementById('loadMoreBtn')?.addEventListener('click', () => {
            this.loadMore();
        });

        // Favorites
        document.getElementById('showFavoritesBtn')?.addEventListener('click', () => {
            this.showFavorites();
        });

        document.getElementById('favoriteBtn')?.addEventListener('click', () => {
            this.toggleCurrentFavorite();
        });

        // EPG button
        document.getElementById('epgBtn')?.addEventListener('click', () => {
            this.showEPG();
        });

        // Fullscreen
        document.getElementById('fullscreenBtn')?.addEventListener('click', () => {
            this.player.toggleFullscreen();
        });

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').classList.remove('active');
            });
        });

        // Close modal on outside click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    }

    async loadChannels(forceRefresh = false) {
        try {
            this.showLoading(true);
            
            const params = {
                limit: this.limit,
                offset: this.offset
            };

            if (this.currentCategory !== 'All') {
                params.category = this.currentCategory;
            }

            if (this.currentCountry) {
                params.country = this.currentCountry;
            }

            const channels = await API.getChannels(params);
            
            if (this.offset === 0) {
                this.channels = channels;
            } else {
                this.channels = [...this.channels, ...channels];
            }

            this.filteredChannels = this.channels;
            this.renderChannels();
            this.updateChannelCount();
            
            // Show/hide load more button
            const loadMoreBtn = document.getElementById('loadMoreBtn');
            if (loadMoreBtn) {
                loadMoreBtn.style.display = channels.length === this.limit ? 'block' : 'none';
            }

        } catch (error) {
            console.error('Failed to load channels:', error);
            this.showError('Failed to load channels. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    renderChannels() {
        const grid = document.getElementById('channelsGrid');
        if (!grid) return;

        if (this.filteredChannels.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-secondary);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📺</div>
                    <h3>No channels found</h3>
                    <p>Try adjusting your filters or search query</p>
                </div>
            `;
            return;
        }

        const channelsHTML = this.filteredChannels.map(channel => this.createChannelCard(channel)).join('');
        
        if (this.offset === 0) {
            grid.innerHTML = channelsHTML;
        } else {
            grid.insertAdjacentHTML('beforeend', channelsHTML);
        }

        // Add click listeners
        grid.querySelectorAll('.channel-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('channel-card-favorite')) {
                    const channelId = card.dataset.channelId;
                    const channel = this.channels.find(ch => ch.id === channelId);
                    if (channel) {
                        this.playChannel(channel);
                        // Scroll to player
                        document.querySelector('.player-section')?.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            });
        });

        // Favorite buttons
        grid.querySelectorAll('.channel-card-favorite').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const channelId = btn.closest('.channel-card').dataset.channelId;
                const channel = this.channels.find(ch => ch.id === channelId);
                if (channel) {
                    this.toggleFavorite(channel, btn);
                }
            });
        });
    }

    createChannelCard(channel) {
        const isFavorite = Storage.isFavorite(channel.id);
        const logo = channel.logo_url || this.getPlaceholderLogo(channel.name);
        
        return `
            <div class="channel-card" data-channel-id="${channel.id}">
                <button class="channel-card-favorite ${isFavorite ? 'active' : ''}">
                    ${isFavorite ? '⭐' : '☆'}
                </button>
                <img src="${logo}" alt="${channel.name}" loading="lazy" onerror="this.src='${this.getPlaceholderLogo(channel.name)}'">
                <div class="channel-card-info">
                    <h3 title="${channel.name}">${channel.name}</h3>
                    <p>
                        ${channel.category || 'General'}
                        ${channel.country ? '• ' + channel.country : ''}
                    </p>
                </div>
            </div>
        `;
    }

    playChannel(channel) {
        this.player.playChannel(channel);
    }

    async handleSearch(query) {
        if (!query || query.trim().length < 2) {
            this.filteredChannels = this.channels;
            this.renderChannels();
            this.updateSectionTitle('All Channels');
            return;
        }

        try {
            this.showLoading(true);
            const results = await API.searchChannels(query.trim());
            this.filteredChannels = results;
            this.renderChannels();
            this.updateSectionTitle(`Search Results: "${query}"`);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            this.showLoading(false);
        }
    }

    handleCategoryFilter(button) {
        // Update active state
        document.querySelectorAll('#categoryFilters .category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');

        // Update category
        this.currentCategory = button.dataset.category;
        this.offset = 0;
        
        // Reload channels
        this.loadChannels();
        this.updateSectionTitle(this.currentCategory === 'All' ? 'All Channels' : this.currentCategory);
    }

    handleCountryFilter(button) {
        // Update active state
        document.querySelectorAll('#countryFilters .category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');

        // Update country
        this.currentCountry = button.dataset.country || '';
        this.offset = 0;
        
        // Reload channels
        this.loadChannels();
    }

    loadMore() {
        this.offset += this.limit;
        this.loadChannels();
    }

    toggleFavorite(channel, buttonElement) {
        const isFavorite = Storage.isFavorite(channel.id);
        
        if (isFavorite) {
            Storage.removeFavorite(channel.id);
            buttonElement.classList.remove('active');
            buttonElement.textContent = '☆';
        } else {
            Storage.addFavorite(channel);
            buttonElement.classList.add('active');
            buttonElement.textContent = '⭐';
        }

        this.updateFavoritesCount();
    }

    toggleCurrentFavorite() {
        const channel = this.player.currentChannel;
        if (!channel) return;

        const isFavorite = Storage.isFavorite(channel.id);
        const favoriteBtn = document.getElementById('favoriteBtn');

        if (isFavorite) {
            Storage.removeFavorite(channel.id);
            if (favoriteBtn) {
                favoriteBtn.textContent = '⭐ Add to Favorites';
                favoriteBtn.classList.remove('active');
            }
        } else {
            Storage.addFavorite(channel);
            if (favoriteBtn) {
                favoriteBtn.textContent = '⭐ Remove from Favorites';
                favoriteBtn.classList.add('active');
            }
        }

        this.updateFavoritesCount();
        this.renderChannels(); // Re-render to update star icons
    }

    showFavorites() {
        const favorites = Storage.getFavorites();
        const modal = document.getElementById('favoritesModal');
        const grid = document.getElementById('favoritesGrid');

        if (!grid || !modal) return;

        if (favorites.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-secondary);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">⭐</div>
                    <h3>No favorites yet</h3>
                    <p>Click the star icon on channels to add them to favorites</p>
                </div>
            `;
        } else {
            const favoritesHTML = favorites.map(channel => this.createChannelCard(channel)).join('');
            grid.innerHTML = favoritesHTML;

            // Add click listeners
            grid.querySelectorAll('.channel-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    if (!e.target.classList.contains('channel-card-favorite')) {
                        const channelId = card.dataset.channelId;
                        const channel = favorites.find(ch => ch.id === channelId);
                        if (channel) {
                            this.playChannel(channel);
                            modal.classList.remove('active');
                            document.querySelector('.player-section')?.scrollIntoView({ behavior: 'smooth' });
                        }
                    }
                });
            });

            // Favorite buttons
            grid.querySelectorAll('.channel-card-favorite').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const channelId = btn.closest('.channel-card').dataset.channelId;
                    const channel = favorites.find(ch => ch.id === channelId);
                    if (channel) {
                        this.toggleFavorite(channel, btn);
                        // Refresh favorites display
                        setTimeout(() => this.showFavorites(), 100);
                    }
                });
            });
        }

        modal.classList.add('active');
    }

    async showEPG() {
        const channel = this.player.currentChannel;
        if (!channel) return;

        const modal = document.getElementById('epgModal');
        const content = document.getElementById('epgContent');
        const channelName = document.getElementById('epgChannelName');

        if (!modal || !content || !channelName) return;

        channelName.textContent = channel.name;
        content.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading TV guide...</p></div>';
        modal.classList.add('active');

        try {
            const epgData = await API.getEPG(channel.name);

            if (epgData.length === 0) {
                content.innerHTML = '<div class="epg-empty">📅<br>No TV guide available for this channel</div>';
                return;
            }

            const epgHTML = epgData.map(program => `
                <div class="epg-item">
                    <div class="epg-time">
                        ${this.formatTime(program.start_time)} - ${this.formatTime(program.end_time)}
                    </div>
                    <div class="epg-title">${program.title}</div>
                    ${program.description ? `<div class="epg-description">${program.description}</div>` : ''}
                </div>
            `).join('');

            content.innerHTML = epgHTML;

        } catch (error) {
            console.error('EPG error:', error);
            content.innerHTML = '<div class="epg-empty">❌<br>Failed to load TV guide</div>';
        }
    }

    formatTime(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    updateFavoritesCount() {
        const favorites = Storage.getFavorites();
        const countEl = document.getElementById('favoritesCount');
        if (countEl) {
            countEl.textContent = `${favorites.length} channel${favorites.length !== 1 ? 's' : ''}`;
        }
    }

    updateChannelCount() {
        const countEl = document.getElementById('channelCount');
        if (countEl) {
            countEl.textContent = `${this.filteredChannels.length} channels`;
        }
    }

    updateSectionTitle(title) {
        const titleEl = document.getElementById('sectionTitle');
        if (titleEl) {
            titleEl.textContent = title;
        }
    }

    loadLastWatched() {
        const lastWatched = Storage.getLastWatched();
        if (lastWatched) {
            console.log('Last watched channel:', lastWatched.name);
            // Optionally auto-play
            // this.playChannel(lastWatched);
        }
    }

    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.style.display = show ? 'block' : 'none';
        }
    }

    showError(message) {
        console.error(message);
        // Could implement a toast notification here
        alert(message);
    }

    getPlaceholderLogo(name) {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=e94560&color=fff&size=200&bold=true`;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new IPTVApp();
});