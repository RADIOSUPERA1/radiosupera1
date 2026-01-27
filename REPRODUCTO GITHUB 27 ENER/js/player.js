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
        this.visibilityState = 'visible';
        
        console.log("📻 Radio Super A1 - Inicializando");
        console.log("🌐 Navegador:", BrowserDetector.getStrategy());
        
        this.init();
    }
    
    init() {
        this.createAudioElement();
        this.bindEvents();
        this.startClock();
        
        setTimeout(() => {
            this.showAutoplayOverlay();
            this.showAlert("Presiona ESCUCHAR AHORA para comenzar", "info");
        }, 1000);
        
        this.showAlert("✅ Sistema listo", "success");
    }
    
    createAudioElement() {
        this.audio = new Audio();
        this.audio.src = 'https://stream.zeno.fm/zignjhagmspuv';
        this.audio.preload = "none";
        this.audio.crossOrigin = "anonymous";
        this.audio.volume = 1.0;
        
        this.audio.addEventListener('playing', () => {
            console.log("▶️ Reproduciendo");
            this.isPlaying = true;
            this.updateUI();
        });
        
        this.audio.addEventListener('error', (e) => {
            console.error("Error de audio:", e);
            this.handleAudioError();
        });
        
        this.audio.addEventListener('canplay', () => {
            console.log("✅ Audio listo");
        });
    }
    
    bindEvents() {
        const playBtn = document.getElementById('neonPlayBtn');
        if (playBtn) {
            playBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleUserInteraction();
                this.togglePlay();
            });
            
            playBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.handleUserInteraction();
                this.togglePlay();
            });
        }
        
        const autoplayBtn = document.getElementById('autoplayBtn');
        if (autoplayBtn) {
            autoplayBtn.addEventListener('click', () => {
                this.handleUserInteraction();
                this.hideAutoplayOverlay();
                this.play();
            });
            
            autoplayBtn.addEventListener('touchend', (e) => {
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
        
        document.addEventListener('click', () => this.handleUserInteraction());
        document.addEventListener('touchstart', () => this.handleUserInteraction(), { passive: true });
        
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.togglePlay();
            }
        });
        
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.visibilityState = 'hidden';
                console.log("📱 Pestaña en segundo plano");
                
                if (BrowserDetector.isIOS() && this.audio && this.isPlaying) {
                    this.audio.volume = 0.5;
                }
            } else {
                this.visibilityState = 'visible';
                console.log("📱 Pestaña activa");
                
                if (this.audio && this.isPlaying) {
                    this.audio.volume = 1.0;
                    
                    if (BrowserDetector.isIOS()) {
                        setTimeout(() => {
                            this.audio.play().catch(e => console.log("iOS: Reanudando..."));
                        }, 300);
                    }
                }
                
                if (this.isPlaying) {
                    this.requestWakeLock();
                }
            }
        });
    }
    
    handleUserInteraction() {
        if (!this.userInteracted) {
            this.userInteracted = true;
            console.log("👤 Usuario interactuó");
            this.hideAutoplayOverlay();
        }
    }
    
    async requestWakeLock() {
        try {
            if ('wakeLock' in navigator) {
                this.wakeLock = await navigator.wakeLock.request('screen');
                console.log("🔋 Wake Lock activado");
                
                this.wakeLock.addEventListener('release', () => {
                    console.log("⚠️ Wake Lock liberado");
                });
            }
        } catch (err) {
            console.log("❌ Wake Lock no disponible");
        }
    }
    
    releaseWakeLock() {
        if (this.wakeLock) {
            this.wakeLock.release();
            this.wakeLock = null;
        }
    }
    
    async play() {
        if (this.isPlaying) return;
        
        try {
            this.showAlert("🔗 Conectando...", "info");
            
            await this.requestWakeLock();
            
            if (!this.audio.src) {
                this.audio.src = 'https://stream.zeno.fm/zignjhagmspuv';
                this.audio.load();
            }
            
            await this.audio.play();
            
            this.isPlaying = true;
            this.updateUI();
            this.retryCount = 0;
            
            if (navigator.vibrate) {
                navigator.vibrate([50, 30, 50]);
            }
            
            this.showAlert("🎶 ¡Conectado!", "success");
            
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
        
        if (this.retryCount <= 3) {
            this.showAlert(`Reintentando (${this.retryCount}/3)...`, "warning");
            
            setTimeout(() => {
                this.audio.src = 'https://stream.zeno.fm/zignjhagmspuv?t=' + Date.now();
                this.audio.load();
                
                if (this.isPlaying) {
                    this.audio.play().catch(e => console.log("Reintento fallido"));
                }
            }, 2000 * this.retryCount);
        } else {
            this.showAlert("❌ Error de conexión", "error");
        }
    }
    
    handlePlayError(error) {
        let message = "Error al conectar";
        
        if (error.name === 'NotAllowedError') {
            message = "Permiso de audio denegado";
        } else if (error.name === 'NetworkError') {
            message = "Error de red";
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
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            const seconds = now.getSeconds().toString().padStart(2, '0');
            
            const timeEl = document.getElementById('currentTime');
            if (timeEl) {
                timeEl.textContent = `${hours}:${minutes}:${seconds}`;
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
        this.alertTimeout = setTimeout(() => this.hideAlert(), 5000);
    }
    
    hideAlert() {
        const alertPanel = document.getElementById('alertPanel');
        if (alertPanel) {
            alertPanel.classList.remove('show');
        }
    }
    
    showAutoplayOverlay() {
        const overlay = document.getElementById('autoplayOverlay');
        if (overlay) {
            setTimeout(() => overlay.classList.add('show'), 500);
        }
    }
    
    hideAutoplayOverlay() {
        const overlay = document.getElementById('autoplayOverlay');
        if (overlay) {
            overlay.classList.remove('show');
        }
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
        
        if (facebookBtn) {
            facebookBtn.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        }
        if (whatsappBtn) {
            whatsappBtn.href = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
        }
        if (twitterBtn) {
            twitterBtn.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        }
    }
}

function hideShareModal() {
    const modal = document.getElementById('shareModal');
    if (modal) {
        modal.classList.remove('show');
    }
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
    }).catch(err => {
        console.error('Error al copiar:', err);
    });
}

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', () => {
    window.radioPlayer = new SuperRadioPlayer();
    
    const shareModalClose = document.getElementById('shareModalClose');
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    const shareModal = document.getElementById('shareModal');
    
    if (shareModalClose) {
        shareModalClose.addEventListener('click', hideShareModal);
    }
    
    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', copyLink);
    }
    
    if (shareModal) {
        shareModal.addEventListener('click', (event) => {
            if (event.target === event.currentTarget) {
                hideShareModal();
            }
        });
    }
    
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (event) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, { passive: false });
    
    console.log("✅ Página cargada y funcional");
});