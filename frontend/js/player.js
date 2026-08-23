// Video Player Manager
class VideoPlayer {
    constructor(videoElementId) {
        this.videoElement = document.getElementById(videoElementId);
        this.player = null;
        this.hls = null;
        this.currentChannel = null;
    }

    // Initialize Video.js player
    initPlayer() {
        if (!this.player) {
            this.player = videojs(this.videoElement, {
                controls: true,
                autoplay: false,
                preload: 'auto',
                fluid: true,
                responsive: true,
                html5: {
                    vhs: {
                        overrideNative: true
                    },
                    nativeVideoTracks: false,
                    nativeAudioTracks: false,
                    nativeTextTracks: false
                }
            });
        }
        return this.player;
    }

    // Play channel
    async playChannel(channel) {
        try {
            console.log('Playing channel:', channel.name);
            this.currentChannel = channel;

            // Show video player, hide placeholder
            const placeholder = document.querySelector('.player-placeholder');
            if (placeholder) placeholder.style.display = 'none';
            this.videoElement.style.display = 'block';

            // Initialize player if not already
            if (!this.player) {
                this.initPlayer();
            }

            const streamUrl = channel.stream_url;

            // Detect stream type and play accordingly
            if (streamUrl.includes('.m3u8')) {
                await this.playHLS(streamUrl);
            } else if (streamUrl.includes('.mpd')) {
                await this.playDASH(streamUrl);
            } else {
                // Direct stream
                this.player.src({
                    src: streamUrl,
                    type: 'video/mp4'
                });
            }

            // Update channel info
            this.updateChannelInfo(channel);

            // Save as last watched
            Storage.setLastWatched(channel);

            // Auto play
            const playPromise = this.player.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn('Auto-play prevented:', error);
                });
            }

        } catch (error) {
            console.error('Playback error:', error);
            this.showError('Failed to load stream. Please try another channel.');
        }
    }

    // Play HLS stream
    async playHLS(url) {
        if (Hls.isSupported()) {
            // Use HLS.js for better compatibility
            if (this.hls) {
                this.hls.destroy();
            }

            this.hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90
            });

            this.hls.loadSource(url);
            this.hls.attachMedia(this.videoElement);

            this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                console.log('HLS manifest loaded');
            });

            this.hls.on(Hls.Events.ERROR, (event, data) => {
                console.error('HLS error:', data);
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.log('Network error, trying to recover...');
                            this.hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.log('Media error, trying to recover...');
                            this.hls.recoverMediaError();
                            break;
                        default:
                            this.showError('Stream error. Please try another channel.');
                            break;
                    }
                }
            });
        } else if (this.videoElement.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS support (Safari)
            this.player.src({
                src: url,
                type: 'application/x-mpegURL'
            });
        } else {
            this.showError('HLS not supported on this browser');
        }
    }

    // Play DASH stream
    async playDASH(url) {
        // For DASH, we'd need dash.js library
        // For now, try with Video.js
        this.player.src({
            src: url,
            type: 'application/dash+xml'
        });
    }

    // Update channel info display
    updateChannelInfo(channel) {
        const infoContainer = document.getElementById('currentChannelInfo');
        const logoImg = document.getElementById('currentChannelLogo');
        const nameEl = document.getElementById('currentChannelName');
        const categoryEl = document.getElementById('currentChannelCategory');
        const favoriteBtn = document.getElementById('favoriteBtn');

        if (infoContainer) infoContainer.style.display = 'flex';
        if (logoImg) logoImg.src = channel.logo_url || this.getPlaceholderLogo(channel.name);
        if (nameEl) nameEl.textContent = channel.name;
        if (categoryEl) categoryEl.textContent = `${channel.category || 'General'} ${channel.country ? '• ' + channel.country : ''}`;

        // Update favorite button
        if (favoriteBtn) {
            const isFav = Storage.isFavorite(channel.id);
            favoriteBtn.textContent = isFav ? '⭐ Remove from Favorites' : '⭐ Add to Favorites';
            favoriteBtn.classList.toggle('active', isFav);
        }
    }

    // Show error message
    showError(message) {
        const placeholder = document.querySelector('.player-placeholder');
        if (placeholder) {
            placeholder.style.display = 'flex';
            placeholder.innerHTML = `
                <div class="placeholder-icon">⚠️</div>
                <h2>Playback Error</h2>
                <p>${message}</p>
            `;
        }
        this.videoElement.style.display = 'none';
    }

    // Get placeholder logo
    getPlaceholderLogo(name) {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=e94560&color=fff&size=200&bold=true`;
    }

    // Toggle fullscreen
    toggleFullscreen() {
        if (this.player) {
            if (this.player.isFullscreen()) {
                this.player.exitFullscreen();
            } else {
                this.player.requestFullscreen();
            }
        }
    }

    // Destroy player
    destroy() {
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }
        if (this.player) {
            this.player.dispose();
            this.player = null;
        }
    }
}