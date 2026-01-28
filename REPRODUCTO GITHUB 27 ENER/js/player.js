// ========== DETECTOR DE NAVEGADOR ==========
const BrowserDetector = {
    isChrome: () => /Chrome/.test(navigator.userAgent) && !/Edge|Edg/.test(navigator.userAgent),
    isEdge: () => /Edge|Edg/.test(navigator.userAgent),
    isFirefox: () => /Firefox/.test(navigator.userAgent),
    isSafari: () => /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent),
    isMobile: () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    isIOS: () => /iPhone|iPad|iPod/.test(navigator.userAgent),
    getStrategy: () => {
        if (BrowserDetector.isChrome()) return 'chrome';
        if (BrowserDetector.isEdge()) return 'edge';
        if (BrowserDetector.isIOS()) return 'ios';
        if (BrowserDetector.isSafari()) return 'safari';
        if (BrowserDetector.isFirefox()) return 'firefox';
        return 'default';
    }
};

// ========== REPRODUCTOR PRINCIPAL ==========
class SuperRadioPlayer {
    constructor() {
        this.audio = null;
        this.isPlaying = false;
        this.userInteracted = false;
        this.alertTimeout = null;
        this.retryCount = 0;
        this.wakeLock = null;
        this.streamUrl = 'https://stream.zeno.fm/zignjhagmspuv'; // URL Centralizada
        
        console.log("📻 Radio Super A1 - Inicializando (Versión Optimizada)");
        console.log("🌐 Navegador:", BrowserDetector.getStrategy());
        
        this.init();
    }
    
    init() {
        this.createAudioElement();
        this.bindEvents();
        this.setupMediaSession(); // NUEVO: Integración con Android/iOS Lock Screen
        this.startClock();
        
        setTimeout(() => {
            this.showAutoplayOverlay();
        }, 1000);
        
        this.showAlert("✅ Sistema listo", "success");
    }
    
    createAudioElement() {
        this.audio = new Audio();
        this.audio.src = this.streamUrl;
        // "metadata" es mejor que "none" para móviles, carga información rápida pero no el buffer pesado
        this.audio.preload = "metadata"; 
        this.audio.crossOrigin = "anonymous";
        
        this.audio.addEventListener('playing', () => {
            console.log("▶️ Reproduciendo");
            this.isPlaying = true;
            this.retryCount = 0; // Reiniciar conteo de errores al tener éxito
            this.updateUI();
            this.updateMediaSessionState('playing');
        });
        
        this.audio.addEventListener('pause', () => {
            console.log("⏸️ Pausado");
            this.isPlaying = false;
            this.updateUI();
            this.updateMediaSessionState('paused');
        });
        
        this.audio.addEventListener('error', (e) => {
            console.error("Error nativo de audio:", e);
            this.handleAudioError();
        });
        
        this.audio.addEventListener('waiting', () => {
            console.log("⏳ Buffering...");
        });

        this.audio.addEventListener('stalled', () => {
             console.warn("⚠️ Stream detenido (stalled), intentando recuperación...");
             if(this.isPlaying) this.handleAudioError();
        });
    }
    
    // NUEVO: Configurar controles de pantalla de bloqueo
    setupMediaSession() {
        if ('mediaSession' in navigator) {
            try {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: 'Radio Super A1',
                    artist: 'En Vivo - Tarma, Perú',
                    album: 'La Radio Poder',
                    artwork: [
                        { src: 'images/social-share.jpg', sizes: '96x96', type: 'image/jpeg' },
                        { src: 'images/social-share.jpg', sizes: '512x512', type: 'image/jpeg' }
                    ]
                });

                navigator.mediaSession.setActionHandler('play', () => this.play());
                navigator.mediaSession.setActionHandler('pause', () => this.pause());
                console.log("🎵 MediaSession configurado");
            } catch (e) {
                console.log("MediaSession no soportado en este navegador");
            }
        }
    }

    updateMediaSessionState(state) {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = state;
        }
    }
    
    bindEvents() {
        const playBtn = document.getElementById('neonPlayBtn');
        
        if (playBtn) {
            // CORRECCIÓN CRÍTICA: Eliminamos 'touchend' para evitar doble disparo
            // Usamos 'click' que en móviles modernos funciona perfectamente
            playBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleUserInteraction();
                this.togglePlay();
            });
        }
        
        const autoplayBtn = document.getElementById('autoplayBtn');
        if (autoplayBtn) {
            autoplayBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleUserInteraction();
                this.hideAutoplayOverlay();
                this.play();
            });
        }
        
        const alertClose = document.getElementById('alertClose');
        if (alertClose) {
            alertClose.addEventListener('click', () => this.hideAlert());
        }
        
        // Interacción global para desbloquear audio
        document.addEventListener('click', () => this.handleUserInteraction(), { once: true });
        
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.togglePlay();
            }
        });
        
        // Manejo de visibilidad (Pestaña en segundo plano)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log("📱 Pestaña en segundo plano");
            } else {
                console.log("📱 Pestaña activa");
                if (this.isPlaying) {
                    this.requestWakeLock();
                }
            }
        });
    }
    
    handleUserInteraction() {
        if (!this.userInteracted) {
            this.userInteracted = true;
            console.log("👤 Usuario interactuó - Audio desbloqueado");
            this.hideAutoplayOverlay();
            // Cargar audio en segundo plano para estar listo
            if(this.audio.readyState === 0) this.audio.load();
        }
    }
    
    async requestWakeLock() {
        if ('wakeLock' in navigator) {
            try {
                if (this.wakeLock !== null) {
                    await this.wakeLock.release();
                }
                this.wakeLock = await navigator.wakeLock.request('screen');
                this.wakeLock.addEventListener('release', () => {
                    // Wake lock liberado (pantalla apagada o cambio de pestaña)
                    console.log("⚠️ Wake Lock liberado");
                });
            } catch (err) {
                console.log("❌ Error Wake Lock:", err);
            }
        }
    }
    
    async play() {
        if (this.isPlaying) return;
        
        try {
            this.showAlert("🔗 Conectando...", "info");
            
            await this.requestWakeLock();
            
            // Asegurar que el src esté cargado
            if (!this.audio.src) {
                this.audio.src = this.streamUrl;
            }
            
            await this.audio.play();
            
            this.isPlaying = true;
            this.updateUI();
            
            if (navigator.vibrate) navigator.vibrate(50);
            this.showAlert("🎶 ¡En Vivo!", "success");
            
        } catch (error) {
            console.error("Error al reproducir:", error);
            this.handlePlayError(error);
        }
    }
    
    pause() {
        if (this.audio) {
            this.audio.pause();
            this.isPlaying = false;
            this.releaseWakeLock();
            this.updateUI();
            this.showAlert("⏸️ Pausado", "warning");
        }
    }
    
    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }
    
    handleAudioError() {
        this.retryCount++;
        
        // Limitar reintentos para evitar bucle infinito
        if (this.retryCount <= 3) {
            console.log(`Reintento ${this.retryCount}/3...`);
            this.showAlert(`Reconectando (${this.retryCount}/3)...`, "warning");
            
            setTimeout(() => {
                // CORRECCIÓN: No agregar timestamp, solo recargar la fuente limpia
                // Evita que el servidor corte la conexión por "doble login"
                this.audio.src = this.streamUrl; 
                this.audio.load();
                
                if (this.userInteracted) {
                    this.play().catch(e => console.log("Reintento fallido en proceso"));
                }
            }, 2000 * this.retryCount);
        } else {
            this.showAlert("❌ Sin señal", "error");
            this.isPlaying = false;
            this.updateUI();
        }
    }
    
    handlePlayError(error) {
        let message = "Error al conectar";
        
        if (error.name === 'NotAllowedError') {
            message = "Toca la pantalla para permitir audio";
        } else if (error.name === 'NotSupportedError') {
            message = "Formato no soportado";
        } else if (error.name === 'NetworkError') {
            message = "Sin conexión a internet";
        }
        
        this.showAlert(`❌ ${message}`, "error");
        
        if (!this.userInteracted) {
            this.showAutoplayOverlay();
        }
    }
    
    updateUI() {
        const playBtn = document.getElementById('neonPlayBtn');
        if (playBtn) {
            playBtn.classList.toggle('playing', this.isPlaying);
            
            const playIcon = playBtn.querySelector('.play-icon');
            const pauseIcon = playBtn.querySelector('.pause-icon');
            
            if (playIcon && pauseIcon) {
                playIcon.style.display = this.isPlaying ? 'none' : 'block';
                pauseIcon.style.display = this.isPlaying ? 'block' : 'none';
            }
        }
        
        const liveIndicator = document.getElementById('liveIndicator');
        if (liveIndicator) {
            liveIndicator.style.display = this.isPlaying ? 'flex' : 'none';
        }
    }
    
    startClock() {
        setInterval(() => {
            const now = new Date();
            const timeString = now.toLocaleTimeString('es-PE', { hour12: false });
            
            const timeEl = document.getElementById('currentTime');
            if (timeEl) {
                timeEl.textContent = timeString;
            }
        }, 1000);
    }
    
    showAlert(message, type = "info") {
        const alertPanel = document.getElementById('alertPanel');
        const alertMessage = document.getElementById('alertMessage');
        
        if (!alertPanel || !alertMessage) return;
        
        const colors = {
            info: '#00ff66',
            success: '#00ff66',
            warning: '#ffaa00',
            error: '#ff3333'
        };
        
        alertPanel.style.borderColor = colors[type] || colors.info;
        alertMessage.textContent = message;
        alertPanel.classList.add('show');
        
        clearTimeout(this.alertTimeout);
        this.alertTimeout = setTimeout(() => this.hideAlert(), 4000); // Un poco más rápido
    }
    
    hideAlert() {
        const alertPanel = document.getElementById('alertPanel');
        if (alertPanel) {
            alertPanel.classList.remove('show');
        }
    }
    
    showAutoplayOverlay() {
        const overlay = document.getElementById('autoplayOverlay');
        if (overlay) overlay.classList.add('show');
    }
    
    hideAutoplayOverlay() {
        const overlay = document.getElementById('autoplayOverlay');
        if (overlay) overlay.classList.remove('show');
    }
}

// ========== FUNCIONES DE COMPARTIR ==========
function showShareModal() {
    const modal = document.getElementById('shareModal');
    if (modal) {
        modal.classList.add('show');
        
        const shareUrl = window.location.href;
        const shareText = '🎵 Escucha Radio Super A1 en vivo las 24 horas 🎶';
        
        const facebookBtn = document.getElementById('shareFacebook');
        const whatsappBtn = document.getElementById('shareWhatsapp');
        const twitterBtn = document.getElementById('shareTwitter');
        
        if (facebookBtn) facebookBtn.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        if (whatsappBtn) whatsappBtn.href = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
        if (twitterBtn) twitterBtn.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    }
}

function hideShareModal() {
    const modal = document.getElementById('shareModal');
    if (modal) modal.classList.remove('show');
}

function copyLink() {
    const shareUrl = window.location.href;
    navigator.clipboard.writeText(shareUrl).then(() => {
        const copyBtn = document.getElementById('copyLinkBtn');
        if (copyBtn) {
            const originalHTML = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check"></i> ¡Copiado!';
            copyBtn.style.background = 'rgba(0, 255, 102, 0.2)';
            setTimeout(() => {
                copyBtn.innerHTML = originalHTML;
                copyBtn.style.background = 'transparent';
            }, 2000);
        }
    }).catch(err => console.error('Error al copiar:', err));
}

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', () => {
    window.radioPlayer = new SuperRadioPlayer();
    
    const shareModalClose = document.getElementById('shareModalClose');
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    const shareModal = document.getElementById('shareModal');
    
    if (shareModalClose) shareModalClose.addEventListener('click', hideShareModal);
    if (copyLinkBtn) copyLinkBtn.addEventListener('click', copyLink);
    
    if (shareModal) {
        shareModal.addEventListener('click', (event) => {
            if (event.target === event.currentTarget) hideShareModal();
        });
    }
    
    // ELIMINADO: El bloque de 'touchend' que prevenía zoom, ya que causaba conflictos de toque en Android
    // Es mejor manejar esto vía meta viewport en el HTML (ya presente: user-scalable=no)
    
    console.log("✅ Página cargada y funcional v2.0");
});