// ==========================================
// REPRODUCTOR NEON VERDE - VERSIÓN FINAL
// ==========================================

class NeonRadioPlayer {
    constructor() {
        this.audio = null;
        this.isPlaying = false;
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.bufferLength = null;
        this.animationId = null;
        this.uptimeSeconds = 0;
        this.autoplayAttempted = false;
        this.mutedAutoplaySuccess = false;
        
        this.init();
    }

    init() {
        console.log("🎧 Inicializando Radio Super A1 Player v3.0 (Optimizado)...");
        console.log("🔍 DEBUG: A punto de llamar a lazyLoadBackground()...");
        this.lazyLoadBackground();
        console.log("🔍 DEBUG: Ya se llamó a lazyLoadBackground().");
        
        this.createAudioElement();
        this.createVisualizerBars();
        this.bindEvents();
        this.startUptimeCounter();
        this.loadPersistedVolume();
        this.attemptMutedAutoplay();
        this.bindKeyboardShortcuts();
        
        console.log("✅ Reproductor optimizado listo.");
    }

    lazyLoadBackground() {
        console.log("🔍 Intentando cargar la imagen de fondo desde 'images/portada.webp'...");
        const bgImage = new Image();
        bgImage.src = 'images/portada.webp';

        bgImage.onload = () => {
            console.log("✅ Imagen de fondo 'portada.webp' cargada y aplicada con éxito.");
            document.body.style.backgroundImage = `url('${bgImage.src}')`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center center';
            document.body.style.backgroundAttachment = 'fixed';
        };

        bgImage.onerror = () => {
            console.error("❌ ERROR CRÍTICO: No se pudo cargar la imagen de fondo 'images/portada.webp'.");
            console.error("   Revisa que el archivo exista en la carpeta 'images' y que el nombre sea correcto.");
        };
    }

    createAudioElement() {
        this.audio = new Audio();
        this.audio.volume = 0.8;
        this.audio.preload = "none";
        this.audio.crossOrigin = "anonymous";
        this.audio.src = 'https://stream.zeno.fm/zignjhagmspuv';
        this.audio.addEventListener('error', (e) => {
            console.error("Error de audio:", e);
            this.updateStatus("ERROR DE STREAM", 0);
            this.showAlert("No se pudo conectar al stream. Intenta reconectar.", "error");
        });
    }

    createVisualizerBars() {
        const container = document.getElementById('visualizerGrid');
        if (!container) return;
        container.innerHTML = '';
        const barCount = window.innerWidth < 480 ? 20 : 32;
        for (let i = 0; i < barCount; i++) {
            const bar = document.createElement('div');
            bar.className = 'vis-bar';
            bar.style.height = '10%';
            container.appendChild(bar);
        }
    }

    bindEvents() {
        const playBtn = document.getElementById('neonPlayBtn');
        if (playBtn) playBtn.addEventListener('click', (e) => { e.stopPropagation(); this.togglePlay(); });
        
        const reconnectBtn = document.getElementById('reconnectBtn');
        if (reconnectBtn) reconnectBtn.addEventListener('click', () => this.forceReconnect());
        
        const qualityBtn = document.getElementById('qualityBtn');
        if (qualityBtn) qualityBtn.addEventListener('click', () => this.showQualityInfo());
        
        const volumeSlider = document.getElementById('volumeSlider');
        if (volumeSlider) volumeSlider.addEventListener('input', (e) => { const volume = e.target.value / 100; if (this.audio) this.audio.volume = volume; this.persistVolume(e.target.value); });
        
        const alertClose = document.getElementById('alertClose');
        if (alertClose) alertClose.addEventListener('click', () => this.hideAlert());

        const autoplayBtn = document.getElementById('autoplayBtn');
        if (autoplayBtn) autoplayBtn.addEventListener('click', () => { this.hideAutoplayOverlay(); this.play(); });

        document.addEventListener('click', () => {
            if (this.mutedAutoplaySuccess && !this.audio.muted) return;
            if (this.mutedAutoplaySuccess && this.audio.muted) {
                this.audio.muted = false; this.isPlaying = true; this.updateUI(); this.startVisualizer(); this.hideAutoplayOverlay(); this.showAlert("Audio activado. ¡Disfruta la música!", "success"); this.updateStatus("EN VIVO", 100);
            }
        }, { once: true });
    }
    
    bindKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && e.target.tagName !== 'INPUT') { e.preventDefault(); this.togglePlay(); }
            if (e.code === 'ArrowUp' && e.target.tagName !== 'INPUT') { e.preventDefault(); this.adjustVolume(5); }
            if (e.code === 'ArrowDown' && e.target.tagName !== 'INPUT') { e.preventDefault(); this.adjustVolume(-5); }
        });
    }

    async attemptMutedAutoplay() {
        try {
            this.audio.muted = true; await this.audio.play(); this.mutedAutoplaySuccess = true; this.isPlaying = true; this.updateUI(); this.startVisualizer(); this.updateStatus("EN VIVO (SILENCIADO)", 100); this.showAlert("Reproduciendo en silencio. Haz clic en cualquier parte para activar el sonido.", "info");
        } catch (error) {
            console.log("Autoplay silenciado bloqueado, esperando interacción del usuario."); this.showAutoplayOverlay();
        }
    }

    showAutoplayOverlay() { const overlay = document.getElementById('autoplayOverlay'); if (overlay) setTimeout(() => overlay.classList.add('show'), 500); }
    hideAutoplayOverlay() { const overlay = document.getElementById('autoplayOverlay'); if (overlay) overlay.classList.remove('show'); }

    async togglePlay() { if (this.isPlaying && !this.audio.muted) { this.pause(); } else { await this.play(); } }
    async play() { try { this.audio.muted = false; this.showAlert("Conectando...", "info"); this.updateStatus("CONECTANDO", 25); await this.audio.play(); this.isPlaying = true; this.updateUI(); this.startVisualizer(); this.showAlert("¡Conectado!", "success"); this.updateStatus("EN VIVO", 100); this.setupAudioAnalysis(); if ("vibrate" in navigator) navigator.vibrate(50); } catch (error) { console.error("Error al reproducir:", error); this.isPlaying = true; this.updateUI(); this.startVisualizer(); this.showAlert("Modo demo activado.", "warning"); this.updateStatus("DEMO ACTIVO", 75); } }
    pause() { if (this.audio) this.audio.pause(); this.isPlaying = false; this.updateUI(); this.stopVisualizer(); this.showAlert("Transmisión en pausa", "warning"); this.updateStatus("PAUSADO", 50); }

// DENTRO DE LA CLASE NeonRadioPlayer

// Reemplaza esta función completa
setupAudioAnalysis() {
    try {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        
        // MEJORA: Mayor resolución para una mejor separación de frecuencias
        this.analyser.fftSize = 512; 
        // MEJORA: Suavizado para que el movimiento sea más fluido y menos nervioso
        this.analyser.smoothingTimeConstant = 0.85;

        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);
        
        if (this.audio.src) {
            const source = this.audioContext.createMediaElementSource(this.audio);
            source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
        }
        
    } catch (error) {
        console.log("Análisis de audio no disponible, usando simulación mejorada.");
    }
}

// Reemplaza esta función completa
startVisualizer() {
    this.stopVisualizer();
    
    const bars = document.querySelectorAll('.vis-bar');
    if (!bars.length) return;

    // MEJORA: Agrupamos frecuencias para un visual más representativo
    const barCount = bars.length;
    const frequencyStep = Math.floor(this.bufferLength / barCount);
    
    const animate = () => {
        if (!this.isPlaying) return;
        
        if (this.analyser && this.dataArray) {
            this.analyser.getByteFrequencyData(this.dataArray);
            
            bars.forEach((bar, i) => {
                let value = 0;
                // Agrupamos varios bins de frecuencia para cada barra
                for (let j = 0; j < frequencyStep; j++) {
                    value += this.dataArray[i * frequencyStep + j];
                }
                value = value / frequencyStep; // Promedio del grupo
                
                // MEJORA: Mapeo no lineal para más dinamismo
                const normalizedValue = value / 255;
                const height = Math.pow(normalizedValue, 1.5) * 100; // Exponencial para resaltar medios y bajos
                const intensity = Math.pow(normalizedValue, 1.2);
                
                this.updateBar(bar, Math.max(5, height), intensity, i / barCount); // Pasamos el índice relativo
            });
        } else {
            // MEJORA: Simulación más dinámica y realista
            bars.forEach((bar, i) => {
                const bass = Math.sin(Date.now() / 1000 + i * 0.5) * 30 + 40;
                const mid = Math.sin(Date.now() / 400 + i * 0.8) * 20 + 30;
                const treble = Math.sin(Date.now() / 150 + i * 1.2) * 10 + 20;
                const height = bass + mid + treble + Math.random() * 15;
                const intensity = 0.4 + Math.random() * 0.6;
                
                this.updateBar(bar, height, intensity, i / barCount);
            });
        }
        
        this.animationId = requestAnimationFrame(() => animate());
    };
    
    animate();
}

// Reemplaza esta función completa
updateBar(bar, height, intensity, frequencyIndex) {
    bar.style.height = `${height}%`;

    // MEJORA: Color dinámico basado en la frecuencia (Bajos -> Verdes, Agudos -> Cian)
    let color1, color2;
    if (frequencyIndex < 0.33) { // Bajos
        color1 = `rgba(0, 255, 102, ${intensity})`;
        color2 = `rgba(0, 200, 82, ${intensity * 0.7})`;
    } else if (frequencyIndex < 0.66) { // Medios
        color1 = `rgba(0, 255, 150, ${intensity})`;
        color2 = `rgba(0, 204, 120, ${intensity * 0.7})`;
    } else { // Agudos
        color1 = `rgba(0, 255, 255, ${intensity})`;
        color2 = `rgba(0, 204, 204, ${intensity * 0.7})`;
    }

    bar.style.background = `linear-gradient(to top, ${color1}, ${color2})`;
    bar.style.boxShadow = `0 0 ${8 + intensity * 20}px rgba(0, 255, 200, ${intensity})`;
}

    updateUI() { const playBtn = document.getElementById('neonPlayBtn'); if (playBtn) { playBtn.classList.toggle('playing', this.isPlaying); const playIcon = playBtn.querySelector('.play-icon'); const pauseIcon = playBtn.querySelector('.pause-icon'); if (playIcon && pauseIcon) { playIcon.style.display = this.isPlaying ? 'none' : 'block'; pauseIcon.style.display = this.isPlaying ? 'block' : 'none'; } } const liveIndicator = document.getElementById('liveIndicator'); if (liveIndicator) { liveIndicator.style.display = this.isPlaying ? 'flex' : 'none'; } }
    updateStatus(status, percent) { const statusEl = document.getElementById('streamStatus'); const statusBar = document.getElementById('statusBar'); if (statusEl) statusEl.textContent = status; if (statusBar) statusBar.style.width = `${percent}%`; if (statusBar) { if (status.includes("EN VIVO")) { statusBar.style.background = "linear-gradient(90deg, #00ff66, #00cc52)"; } else if (status === "CONECTANDO") { statusBar.style.background = "linear-gradient(90deg, #ffaa00, #ff8800)"; } else if (status === "PAUSADO") { statusBar.style.background = "linear-gradient(90deg, #666666, #888888)"; } else if (status.includes("ERROR")) { statusBar.style.background = "linear-gradient(90deg, #ff3333, #cc0000)"; } else { statusBar.style.background = "linear-gradient(90deg, #aaaaaa, #888888)"; } } }

    startUptimeCounter() { setInterval(() => { if (this.isPlaying) { this.uptimeSeconds++; const hours = Math.floor(this.uptimeSeconds / 3600); const minutes = Math.floor((this.uptimeSeconds % 3600) / 60); const seconds = this.uptimeSeconds % 60; const uptimeEl = document.getElementById('uptimeCounter'); if (uptimeEl) { uptimeEl.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`; } } }, 1000); }

    forceReconnect() { this.showAlert("Reconectando...", "info"); this.updateStatus("RECONECTANDO", 50); const wasPlaying = this.isPlaying; if (wasPlaying) this.pause(); if (this.audio) { const currentSrc = this.audio.src; this.audio.src = ''; this.audio.load(); this.audio.src = currentSrc; } setTimeout(() => { if (wasPlaying) { this.play(); } else { this.showAlert("Reconexión completada. Presiona PLAY.", "success"); this.updateStatus("LISTO", 100); } }, 1500); }
    showQualityInfo() { this.showAlert("Para cambiar la calidad, necesitas URLs de stream diferentes. Contáctanos para implementarlo.", "info"); }
    adjustVolume(change) { const volumeSlider = document.getElementById('volumeSlider'); if (volumeSlider) { let newVolume = parseInt(volumeSlider.value) + change; newVolume = Math.max(0, Math.min(100, newVolume)); volumeSlider.value = newVolume; volumeSlider.dispatchEvent(new Event('input')); } }
    
    persistVolume(value) { try { localStorage.setItem('radio-supera1-volume', value); } catch (e) { console.warn("No se pudo guardar el volumen."); } }
    loadPersistedVolume() { try { const savedVolume = localStorage.getItem('radio-supera1-volume'); if (savedVolume) { const volumeSlider = document.getElementById('volumeSlider'); if (volumeSlider) { volumeSlider.value = savedVolume; this.audio.volume = savedVolume / 100; } } } catch (e) { console.warn("No se pudo cargar el volumen guardado."); } }

    showAlert(message, type = "info") { const alertPanel = document.getElementById('alertPanel'); const alertMessage = document.getElementById('alertMessage'); if (!alertPanel || !alertMessage) return; const colors = { info: '#00ff66', success: '#00ff66', warning: '#ffaa00', error: '#ff3333' }; alertPanel.style.borderColor = colors[type] || colors.info; alertMessage.textContent = message; alertPanel.classList.add('show'); clearTimeout(this.alertTimeout); this.alertTimeout = setTimeout(() => { this.hideAlert(); }, 5000); }
    hideAlert() { const alertPanel = document.getElementById('alertPanel'); if (alertPanel) { alertPanel.classList.remove('show'); } }
}

function shareSite() { if (navigator.share) { navigator.share({ title: 'Radio Super A1', text: 'Escucha Radio Super A1 en vivo las 24 horas 🎶', url: 'https://radiosupera1.netlify.app/' }); } else { alert('Tu navegador no soporta compartir. Copia el enlace: https://radiosupera1.netlify.app/'); } }

document.addEventListener('DOMContentLoaded', () => { window.radioPlayer = new NeonRadioPlayer(); });