/**
 * UIManager.js
 * Comprehensive UI & HUD Controller with modern futuristic glassmorphism styling.
 * Manages Start Screen, Main Menu, Garage Showroom, Mode Selector, Settings, Pause Menu,
 * Speedometer & RPM Gauges, Nitro Meter, Mini-Map Radar, Interactive World Map, and GPS Guidance.
 */

class UIManager {
  constructor(game) {
    this.game = game;

    // Mini-map 2D Canvas
    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;

    // World Map Modal Canvas
    this.worldMapCanvas = document.getElementById('world-map-canvas');
    this.worldMapCtx = this.worldMapCanvas ? this.worldMapCanvas.getContext('2d') : null;

    // Selected destination on world map
    this.selectedLandmark = null;

    // DOM Elements
    this.dom = {
      startScreen: document.getElementById('start-screen'),
      mainMenu: document.getElementById('main-menu'),
      modeModal: document.getElementById('mode-modal'),
      garageModal: document.getElementById('garage-modal'),
      settingsModal: document.getElementById('settings-modal'),
      helpModal: document.getElementById('help-modal'),
      worldMapModal: document.getElementById('world-map-modal'),
      pauseMenu: document.getElementById('pause-menu'),
      resultsModal: document.getElementById('results-modal'),
      hud: document.getElementById('hud'),

      // Speedometer & Gauges
      speedVal: document.getElementById('hud-speed-val'),
      gearVal: document.getElementById('hud-gear-val'),
      rpmBar: document.getElementById('hud-rpm-fill'),
      speedArc: document.getElementById('hud-speed-arc'),
      nitroBar: document.getElementById('hud-nitro-fill'),

      // Race Stats
      raceStats: document.getElementById('hud-race-stats'),
      positionBadge: document.getElementById('hud-pos-val'),
      lapBadge: document.getElementById('hud-lap-val'),
      timerVal: document.getElementById('hud-timer-val'),
      bestLapVal: document.getElementById('hud-best-val'),

      // GPS HUD Elements
      gpsBanner: document.getElementById('hud-gps-banner'),
      gpsDestName: document.getElementById('gps-dest-name'),
      gpsDistVal: document.getElementById('gps-dist-val'),
      gpsArrow: document.getElementById('gps-arrow'),
      btnClearGps: document.getElementById('btn-clear-gps'),

      // Countdown & Alerts
      countdownOverlay: document.getElementById('countdown-overlay'),
      countdownText: document.getElementById('countdown-text'),
      notificationBanner: document.getElementById('notification-banner'),

      // Cam Indicator
      cameraIndicator: document.getElementById('camera-indicator')
    };

    this.initEvents();
    this.populateLandmarksList();
  }

  initEvents() {
    // 1. Start Screen Launch
    const btnStart = document.getElementById('btn-start-game');
    if (btnStart) {
      btnStart.addEventListener('click', () => {
        if (this.game.audio) this.game.audio.playClick();
        if (this.game.audio) this.game.audio.startMusic();
        this.dom.startScreen.classList.add('hidden');
        this.dom.mainMenu.classList.remove('hidden');
      });
    }

    // 2. Main Menu Action Buttons
    const btnPlayFree = document.getElementById('btn-menu-free');
    if (btnPlayFree) {
      btnPlayFree.addEventListener('click', () => {
        this.playClick();
        this.startGameWithMode('free_drive');
      });
    }

    const btnMenuRace = document.getElementById('btn-menu-race');
    if (btnMenuRace) {
      btnMenuRace.addEventListener('click', () => {
        this.playClick();
        this.openModal('modeModal');
      });
    }

    const btnMenuGarage = document.getElementById('btn-menu-garage');
    if (btnMenuGarage) {
      btnMenuGarage.addEventListener('click', () => {
        this.playClick();
        this.openGarage();
      });
    }

    const btnMenuSettings = document.getElementById('btn-menu-settings');
    if (btnMenuSettings) {
      btnMenuSettings.addEventListener('click', () => {
        this.playClick();
        this.openModal('settingsModal');
      });
    }

    const btnMenuHelp = document.getElementById('btn-menu-help');
    if (btnMenuHelp) {
      btnMenuHelp.addEventListener('click', () => {
        this.playClick();
        this.openModal('helpModal');
      });
    }

    const btnMenuMap = document.getElementById('btn-menu-map');
    if (btnMenuMap) {
      btnMenuMap.addEventListener('click', () => {
        this.playClick();
        this.openWorldMap();
      });
    }

    // Modal Close Buttons
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.playClick();
        this.closeAllModals();
      });
    });

    // 3. Mode Select Cards
    document.querySelectorAll('.mode-card').forEach(card => {
      card.addEventListener('click', () => {
        const mode = card.getAttribute('data-mode');
        this.playClick();
        this.closeAllModals();
        this.startGameWithMode(mode);
      });
    });

    // 4. Garage Car Selection Cards
    document.querySelectorAll('.car-select-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.car-select-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const carType = card.getAttribute('data-car');
        this.playClick();
        this.game.setPlayerCarType(carType);
        this.updateGarageStats(carType);
      });
    });

    // Garage Paint Color Swatches
    document.querySelectorAll('.color-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        const color = swatch.getAttribute('data-color');
        this.playClick();
        this.game.setPlayerCarColor(parseInt(color, 16));
      });
    });

    // 5. Settings Controls
    const shadowToggle = document.getElementById('setting-shadows');
    if (shadowToggle) {
      shadowToggle.addEventListener('change', (e) => {
        this.game.toggleShadows(e.target.checked);
      });
    }

    const weatherSelect = document.getElementById('setting-weather');
    if (weatherSelect) {
      weatherSelect.addEventListener('change', (e) => {
        this.game.weather.applyPreset(e.target.value);
      });
    }

    const diffSelect = document.getElementById('setting-difficulty');
    if (diffSelect) {
      diffSelect.addEventListener('change', (e) => {
        this.game.setDifficulty(e.target.value);
      });
    }

    const volMaster = document.getElementById('setting-vol-master');
    const volSfx = document.getElementById('setting-vol-sfx');
    const volMusic = document.getElementById('setting-vol-music');
    const onVolumeChange = () => {
      if (this.game.audio) {
        this.game.audio.setVolume(
          parseFloat(volMaster.value),
          parseFloat(volSfx.value),
          parseFloat(volMusic.value)
        );
      }
    };
    if (volMaster) volMaster.addEventListener('input', onVolumeChange);
    if (volSfx) volSfx.addEventListener('input', onVolumeChange);
    if (volMusic) volMusic.addEventListener('input', onVolumeChange);

    const btnFullscreen = document.getElementById('btn-fullscreen');
    if (btnFullscreen) {
      btnFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    }

    // 6. Pause Menu Buttons
    const btnResume = document.getElementById('btn-pause-resume');
    if (btnResume) {
      btnResume.addEventListener('click', () => {
        this.playClick();
        this.game.togglePause();
      });
    }

    const btnRestart = document.getElementById('btn-pause-restart');
    if (btnRestart) {
      btnRestart.addEventListener('click', () => {
        this.playClick();
        this.game.restartCurrentMode();
        this.hidePauseMenu();
      });
    }

    const btnPauseMenu = document.getElementById('btn-pause-mainmenu');
    if (btnPauseMenu) {
      btnPauseMenu.addEventListener('click', () => {
        this.playClick();
        this.hidePauseMenu();
        this.dom.hud.classList.add('hidden');
        this.dom.mainMenu.classList.remove('hidden');
        this.game.cameraController.setMode('orbit');
      });
    }

    // 7. Results Modal Buttons
    const btnResultsRetry = document.getElementById('btn-results-retry');
    if (btnResultsRetry) {
      btnResultsRetry.addEventListener('click', () => {
        this.playClick();
        this.dom.resultsModal.classList.add('hidden');
        this.game.restartCurrentMode();
      });
    }

    const btnResultsMenu = document.getElementById('btn-results-menu');
    if (btnResultsMenu) {
      btnResultsMenu.addEventListener('click', () => {
        this.playClick();
        this.dom.resultsModal.classList.add('hidden');
        this.dom.hud.classList.add('hidden');
        this.dom.mainMenu.classList.remove('hidden');
        this.game.cameraController.setMode('orbit');
      });
    }

    // 8. HUD Quick Action Buttons
    const btnHudCam = document.getElementById('btn-hud-cam');
    if (btnHudCam) {
      btnHudCam.addEventListener('click', () => {
        this.playClick();
        const mode = this.game.cameraController.nextMode();
        this.showCameraIndicator(mode);
      });
    }

    const btnHudLight = document.getElementById('btn-hud-light');
    if (btnHudLight) {
      btnHudLight.addEventListener('click', () => {
        this.playClick();
        this.game.playerCar.toggleHeadlights();
      });
    }

    const btnHudReset = document.getElementById('btn-hud-reset');
    if (btnHudReset) {
      btnHudReset.addEventListener('click', () => {
        this.playClick();
        this.game.resetPlayerCar();
      });
    }

    const btnHudMap = document.getElementById('btn-hud-map');
    if (btnHudMap) {
      btnHudMap.addEventListener('click', () => {
        this.playClick();
        this.toggleWorldMap();
      });
    }

    const btnHudMute = document.getElementById('btn-hud-mute');
    if (btnHudMute) {
      btnHudMute.addEventListener('click', () => {
        const muted = this.game.audio.toggleMute();
        btnHudMute.innerHTML = muted ? '🔇' : '🔊';
      });
    }

    // Clear GPS Route Button
    if (this.dom.btnClearGps) {
      this.dom.btnClearGps.addEventListener('click', () => {
        this.playClick();
        this.game.world.clearGPSWaypoint();
        this.dom.gpsBanner.classList.add('hidden');
        this.notify('GPS ROUTE CLEARED', 1200);
      });
    }

    // World Map Canvas Interactive Click to set custom waypoint
    if (this.worldMapCanvas) {
      this.worldMapCanvas.addEventListener('click', (e) => {
        this.handleWorldMapClick(e);
      });
    }

    // Set Waypoint Button in World Map Modal
    const btnSetWp = document.getElementById('btn-set-waypoint');
    if (btnSetWp) {
      btnSetWp.addEventListener('click', () => {
        if (this.selectedLandmark) {
          this.setGPS(this.selectedLandmark.x, this.selectedLandmark.z, this.selectedLandmark.name);
          this.closeAllModals();
        }
      });
    }
  }

  playClick() {
    if (this.game.audio) this.game.audio.playClick();
  }

  openModal(modalKey) {
    this.closeAllModals();
    if (this.dom[modalKey]) {
      this.dom[modalKey].classList.remove('hidden');
    }
  }

  closeAllModals() {
    ['modeModal', 'garageModal', 'settingsModal', 'helpModal', 'worldMapModal', 'resultsModal'].forEach(k => {
      if (this.dom[k]) this.dom[k].classList.add('hidden');
    });
  }

  openGarage() {
    this.openModal('garageModal');
    this.game.cameraController.setMode('orbit');
    this.updateGarageStats(this.game.playerCar.carType);
  }

  updateGarageStats(carType) {
    const specs = this.game.playerCar.getCarSpecs(carType);
    const setStat = (id, percent) => {
      const el = document.getElementById(id);
      if (el) el.style.width = `${percent}%`;
    };
    setStat('stat-speed-bar', (specs.topSpeed / 350) * 100);
    setStat('stat-accel-bar', (specs.accelForce / 35) * 100);
    setStat('stat-handling-bar', (specs.handling / 1.3) * 100);
    setStat('stat-brake-bar', (specs.brakeForce / 45) * 100);
  }

  toggleWorldMap() {
    if (!this.dom.worldMapModal) return;
    if (this.dom.worldMapModal.classList.contains('hidden')) {
      this.openWorldMap();
    } else {
      this.dom.worldMapModal.classList.add('hidden');
    }
  }

  openWorldMap() {
    this.openModal('worldMapModal');
    this.renderWorldMap();
  }

  populateLandmarksList() {
    const listContainer = document.getElementById('map-landmarks-list');
    if (!listContainer || !this.game.world || !this.game.world.landmarks) return;

    listContainer.innerHTML = '';
    this.game.world.landmarks.forEach(lm => {
      const item = document.createElement('div');
      item.className = 'landmark-list-item';
      item.setAttribute('data-id', lm.id);
      item.innerHTML = `
        <div class="landmark-item-header">
          <span class="landmark-icon">${lm.icon}</span>
          <span class="landmark-name">${lm.name}</span>
        </div>
        <div class="landmark-desc">${lm.desc}</div>
      `;
      item.addEventListener('click', () => {
        document.querySelectorAll('.landmark-list-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
        this.selectedLandmark = lm;
        this.renderWorldMap();
      });
      listContainer.appendChild(item);
    });
  }

  handleWorldMapClick(e) {
    if (!this.worldMapCanvas) return;
    const rect = this.worldMapCanvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    // Convert canvas click to world coordinates
    const w = this.worldMapCanvas.width;
    const h = this.worldMapCanvas.height;
    const scale = 0.42; // World map scale factor

    const worldX = (cx - w / 2) / scale;
    const worldZ = (cy - h / 2) / scale;

    // Check if clicked close to a known landmark
    let closest = null;
    let minDist = 35;
    if (this.game.world && this.game.world.landmarks) {
      for (const lm of this.game.world.landmarks) {
        const lx = w / 2 + lm.x * scale;
        const ly = h / 2 + lm.z * scale;
        const d = Math.hypot(cx - lx, cy - ly);
        if (d < minDist) {
          minDist = d;
          closest = lm;
        }
      }
    }

    if (closest) {
      this.selectedLandmark = closest;
      this.setGPS(closest.x, closest.z, closest.name);
    } else {
      const customName = `Waypoint (${Math.round(worldX)}, ${Math.round(worldZ)})`;
      this.selectedLandmark = { x: worldX, z: worldZ, name: customName };
      this.setGPS(worldX, worldZ, customName);
    }
    this.renderWorldMap();
  }

  setGPS(x, z, name) {
    if (this.game.world) {
      this.game.world.setGPSWaypoint(x, z, name);
    }
    if (this.dom.gpsBanner) {
      this.dom.gpsBanner.classList.remove('hidden');
      if (this.dom.gpsDestName) this.dom.gpsDestName.textContent = name.toUpperCase();
    }
    this.notify(`GPS WAYPOINT SET: ${name.toUpperCase()}`, 2000);
  }

  renderWorldMap() {
    if (!this.worldMapCtx || !this.worldMapCanvas) return;
    const ctx = this.worldMapCtx;
    const w = this.worldMapCanvas.width;
    const h = this.worldMapCanvas.height;

    // Dark sleek GPS grid background
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, w, h);

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    const scale = 0.42;
    const toMapX = (wx) => w / 2 + wx * scale;
    const toMapY = (wz) => h / 2 + wz * scale;

    // Draw Water Bay
    ctx.fillStyle = '#0c2238';
    ctx.fillRect(toMapX(-350), toMapY(-750), 700 * scale, 400 * scale);

    // Draw Road Network
    if (this.game.road && this.game.road.segments) {
      ctx.strokeStyle = '#2c3e50';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const seg of this.game.road.segments) {
        ctx.beginPath();
        ctx.moveTo(toMapX(seg.p1.x), toMapY(seg.p1.y));
        ctx.lineTo(toMapX(seg.p2.x), toMapY(seg.p2.y));
        ctx.stroke();
      }

      // Asphalt centerlines
      ctx.strokeStyle = '#34495e';
      ctx.lineWidth = 10;
      for (const seg of this.game.road.segments) {
        ctx.beginPath();
        ctx.moveTo(toMapX(seg.p1.x), toMapY(seg.p1.y));
        ctx.lineTo(toMapX(seg.p2.x), toMapY(seg.p2.y));
        ctx.stroke();
      }
    }

    // Draw GPS Active Waypoint Route Line
    if (this.game.world && this.game.world.gpsWaypoint.active) {
      const pCar = this.game.playerCar;
      const wp = this.game.world.gpsWaypoint;
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(toMapX(pCar.position.x), toMapY(pCar.position.z));
      ctx.lineTo(toMapX(wp.x), toMapY(wp.z));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw Landmarks
    if (this.game.world && this.game.world.landmarks) {
      for (const lm of this.game.world.landmarks) {
        const lx = toMapX(lm.x);
        const ly = toMapY(lm.z);
        const isSelected = this.selectedLandmark && this.selectedLandmark.id === lm.id;

        // Glowing outer pin ring
        ctx.beginPath();
        ctx.arc(lx, ly, isSelected ? 12 : 7, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? '#ffd700' : '#00f0ff';
        ctx.shadowColor = isSelected ? '#ffd700' : '#00f0ff';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Label
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = isSelected ? '#ffffff' : '#bdc3c7';
        ctx.textAlign = 'center';
        ctx.fillText(`${lm.icon} ${lm.name}`, lx, ly - (isSelected ? 16 : 10));
      }
    }

    // Draw Player Vehicle Blip
    const pCar = this.game.playerCar;
    if (pCar) {
      const px = toMapX(pCar.position.x);
      const py = toMapY(pCar.position.z);

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(pCar.heading);

      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(6, 7);
      ctx.lineTo(-6, 7);
      ctx.closePath();
      ctx.fillStyle = '#00ff88';
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();
    }
  }

  startGameWithMode(mode) {
    this.dom.mainMenu.classList.add('hidden');
    this.dom.hud.classList.remove('hidden');
    this.game.cameraController.setMode('chase');
    this.game.raceManager.startMode(mode);
  }

  showModeHUD(mode) {
    if (mode === 'free_drive') {
      this.dom.raceStats.classList.add('hidden');
    } else {
      this.dom.raceStats.classList.remove('hidden');
    }
  }

  showCountdown(text) {
    this.dom.countdownText.textContent = text;
    this.dom.countdownOverlay.classList.remove('hidden');
  }

  hideCountdown() {
    this.dom.countdownOverlay.classList.add('hidden');
  }

  showPauseMenu() {
    this.dom.pauseMenu.classList.remove('hidden');
  }

  hidePauseMenu() {
    this.dom.pauseMenu.classList.add('hidden');
  }

  showCameraIndicator(modeName) {
    if (!this.dom.cameraIndicator) return;
    this.dom.cameraIndicator.textContent = `CAMERA: ${modeName.toUpperCase()}`;
    this.dom.cameraIndicator.classList.remove('hidden');
    clearTimeout(this.camTimeout);
    this.camTimeout = setTimeout(() => {
      this.dom.cameraIndicator.classList.add('hidden');
    }, 1800);
  }

  notify(msg, duration = 2000) {
    if (!this.dom.notificationBanner) return;
    this.dom.notificationBanner.textContent = msg;
    this.dom.notificationBanner.classList.remove('hidden');
    clearTimeout(this.notifyTimeout);
    this.notifyTimeout = setTimeout(() => {
      this.dom.notificationBanner.classList.add('hidden');
    }, duration);
  }

  showRaceResults(results) {
    const titleEl = document.getElementById('results-title');
    const posEl = document.getElementById('results-pos');
    const timeEl = document.getElementById('results-time');
    const bestEl = document.getElementById('results-best');

    if (titleEl) titleEl.textContent = results.success ? 'RACE FINISHED!' : (results.customMsg || 'CHALLENGE FAILED');
    if (posEl) posEl.textContent = results.position ? `${results.position}${this.getOrdinal(results.position)} PLACE` : '--';
    if (timeEl) timeEl.textContent = results.totalTime;
    if (bestEl) bestEl.textContent = results.bestLap;

    this.dom.resultsModal.classList.remove('hidden');
  }

  getOrdinal(n) {
    const s = ['TH', 'ST', 'ND', 'RD'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }

  updateHUD(car, raceManager) {
    if (!car || this.dom.hud.classList.contains('hidden')) return;

    // 1. Digital Speedometer
    const spd = Math.round(Math.abs(car.speedKmh));
    this.dom.speedVal.textContent = spd;

    // Gear Readout
    this.dom.gearVal.textContent = car.gear === -1 ? 'R' : (car.gear === 0 ? 'N' : car.gear);

    // RPM fill bar
    const rpmPercent = Math.min(100, Math.round(car.rpm * 100));
    this.dom.rpmBar.style.width = `${rpmPercent}%`;
    if (car.rpm > 0.88) {
      this.dom.rpmBar.classList.add('redline');
    } else {
      this.dom.rpmBar.classList.remove('redline');
    }

    // Speedometer Radial Stroke Offset
    const maxSpeedForGauge = 320;
    const speedRatio = Math.min(1.0, spd / maxSpeedForGauge);
    const strokeDashoffset = 283 - (283 * 0.75 * speedRatio);
    if (this.dom.speedArc) {
      this.dom.speedArc.style.strokeDashoffset = strokeDashoffset;
    }

    // Nitro Bar
    const nitroPercent = Math.round((car.nitro / car.nitroCapacity) * 100);
    this.dom.nitroBar.style.width = `${nitroPercent}%`;

    // 2. Race Overlay
    if (raceManager && raceManager.mode !== 'free_drive') {
      this.dom.positionBadge.textContent = `${raceManager.playerPosition}/4`;
      this.dom.lapBadge.textContent = `LAP ${raceManager.currentLap}/${raceManager.totalLaps}`;
      this.dom.timerVal.textContent = raceManager.mode === 'checkpoint'
        ? `${Math.max(0, Math.ceil(raceManager.challengeTimeLeft))}s`
        : raceManager.formatTime(raceManager.raceTimer);

      this.dom.bestLapVal.textContent = raceManager.bestLapTime !== Infinity
        ? raceManager.formatTime(raceManager.bestLapTime)
        : '--:--';
    }

    // 3. Live GPS Route Guidance Navigation Update
    if (this.game.world && this.game.world.gpsWaypoint.active) {
      const wp = this.game.world.gpsWaypoint;
      const dx = wp.x - car.position.x;
      const dz = wp.z - car.position.z;
      const distMeters = Math.round(Math.hypot(dx, dz));

      this.dom.gpsBanner.classList.remove('hidden');
      if (this.dom.gpsDistVal) this.dom.gpsDistVal.textContent = `${distMeters}m`;

      // Calculate relative bearing angle to destination for the compass arrow
      const cosH = Math.cos(car.heading);
      const sinH = Math.sin(car.heading);
      const relRight = dx * cosH - dz * sinH;
      const relForward = -dx * sinH - dz * cosH;
      const bearingAngle = Math.atan2(relRight, relForward);

      if (this.dom.gpsArrow) {
        this.dom.gpsArrow.style.transform = `rotate(${bearingAngle}rad)`;
      }

      // Reached destination notification
      if (distMeters < 16) {
        this.notify(`ARRIVED AT: ${wp.name.toUpperCase()}!`, 3000);
        this.game.world.clearGPSWaypoint();
        this.dom.gpsBanner.classList.add('hidden');
      }
    }

    // 4. Mini-map Radar Rendering
    this.drawMinimap(car, raceManager);
  }

  drawMinimap(car, raceManager) {
    if (!this.minimapCtx || !this.minimapCanvas) return;
    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Radar circular background
    ctx.save();
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(12, 17, 28, 0.88)';
    ctx.fill();
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Center map around player
    const scale = 0.18;
    const cx = w / 2;
    const cy = h / 2;

    const toMapX = (wx) => cx + (wx - car.position.x) * scale;
    const toMapY = (wz) => cy + (wz - car.position.z) * scale;

    // Draw Roads
    if (this.game.road && this.game.road.segments) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 3.5;
      for (const seg of this.game.road.segments) {
        ctx.beginPath();
        ctx.moveTo(toMapX(seg.p1.x), toMapY(seg.p1.y));
        ctx.lineTo(toMapX(seg.p2.x), toMapY(seg.p2.y));
        ctx.stroke();
      }
    }

    // Draw Next Checkpoint
    if (raceManager && raceManager.checkpointGates && raceManager.mode !== 'free_drive') {
      const currentGate = raceManager.checkpointGates[raceManager.currentCheckpointIndex];
      if (currentGate) {
        ctx.beginPath();
        ctx.arc(toMapX(currentGate.position.x), toMapY(currentGate.position.z), 5.5, 0, Math.PI * 2);
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // Draw GPS Waypoint on radar
    if (this.game.world && this.game.world.gpsWaypoint.active) {
      const wp = this.game.world.gpsWaypoint;
      const gx = toMapX(wp.x);
      const gy = toMapY(wp.z);

      ctx.beginPath();
      ctx.arc(gx, gy, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Draw AI Cars
    if (this.game.aiControllers) {
      ctx.fillStyle = '#ff4444';
      for (const ai of this.game.aiControllers) {
        const ax = toMapX(ai.car.position.x);
        const ay = toMapY(ai.car.position.z);
        ctx.beginPath();
        ctx.arc(ax, ay, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw Player Triangle at center pointing in heading direction
    ctx.translate(cx, cy);
    ctx.rotate(car.heading);

    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4.5, 5);
    ctx.lineTo(-4.5, 5);
    ctx.closePath();
    ctx.fillStyle = '#00ff88';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }
}

window.UIManager = UIManager;
