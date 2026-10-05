/**
 * Game.js
 * Master 3D Racing Game coordinator.
 * Orchestrates WebGL rendering, physics step, player controls, AI rivals,
 * city traffic, weather, audio synthesis, camera tracking, and UI updates.
 */

class Game {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.isPaused = false;
    this.lastTime = performance.now();

    // FIX 3: Smooth frame timing with exponential moving average
    this.smoothDt = 0.016;       // Smoothed delta time (starts at 60fps target)
    this.dtSmoothing = 0.1;      // EMA factor — lower = smoother, less responsive to spikes

    this.initThree();
    this.initSystems();
    this.initEventListeners();

    // Start in Menu / Showcase mode
    this.cameraController.setMode('orbit');

    // Run animation loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initThree() {
    // 1. WebGL Renderer — FIX 3: Optimized settings for maximum smoothness
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
      stencil: false   // Disable stencil buffer we don't use — saves memory bandwidth
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    // FIX 3: Cap pixel ratio at 2 to prevent performance degradation on high-DPI screens
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    // FIX 8: Enable better color management for richer visuals
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // FIX 3: Sort objects to minimize overdraw
    this.renderer.sortObjects = true;

    this.container.appendChild(this.renderer.domElement);

    // 2. Scene
    this.scene = new THREE.Scene();

    // 3. Camera — slightly tighter far plane to reduce GPU overdraw
    this.camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.2,
      1400
    );
    this.camera.position.set(0, 5, 12);
  }

  initSystems() {
    // Input & Audio
    this.input = new InputManager();
    this.audio = new AudioManager();

    // Physics Engine
    this.physics = new Physics();

    // Particle FX
    this.particles = new ParticleSystem(this.scene);

    // Road Network & Waypoints
    this.road = new Road(this.scene, this.physics);

    // 3D Open World Environment
    this.world = new World(this.scene, this.physics);

    // Player Sports Car (Spawned at start line)
    const startWp = this.road.raceWaypoints[0];
    this.playerCar = new Car(this.scene, this.physics, this.particles, this.audio, {
      type: 'apex',
      color: 0x00e5ff,
      x: startWp.x,
      z: startWp.z,
      heading: Math.PI,
      isAI: false
    });

    // 3 Rival AI Sports Cars
    this.aiCars = [];
    this.aiControllers = [];
    const aiConfigs = [
      { type: 'phantom', color: 0xff4500, x: startWp.x + 5, z: startWp.z + 12 },
      { type: 'monza', color: 0x0984e3, x: startWp.x - 5, z: startWp.z + 22 },
      { type: 'cyber', color: 0x00b894, x: startWp.x + 4, z: startWp.z + 32 }
    ];

    aiConfigs.forEach(cfg => {
      const car = new Car(this.scene, this.physics, this.particles, null, {
        type: cfg.type,
        color: cfg.color,
        x: cfg.x,
        z: cfg.z,
        heading: Math.PI,
        isAI: true
      });
      const ai = new AIController(car, this.road.raceWaypoints, 'medium');
      this.aiCars.push(car);
      this.aiControllers.push(ai);
    });

    // Ambient City Traffic (civilian vehicles & taxis)
    this.traffic = new TrafficManager(this.scene, this.physics);

    // Dynamic Weather & Lighting System
    this.weather = new WeatherSystem(this.scene, this.renderer, this.particles, this.world, this.playerCar);

    // Multi-View Camera Controller
    this.cameraController = new CameraController(this.camera, this.playerCar);

    // UI Manager
    this.ui = new UIManager(this);

    // Race Progression Manager
    this.raceManager = new RaceManager(this.scene, this.road, this.audio, this.ui);
    this.raceManager.setReferences(this.playerCar, this.aiControllers, this.ui);

    // Wire Collision Feedback
    this.physics.onCollision((intensity, point, normal) => {
      this.audio.playCrash(intensity);
      this.cameraController.addTrauma(intensity * 0.7);
      this.particles.emitSparks(point, normal, Math.floor(15 * intensity));
    });
  }

  initEventListeners() {
    window.addEventListener('resize', () => this.onResize());

    // Single-frame input toggle checks in game loop
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  setPlayerCarType(type) {
    this.playerCar.setCarType(type);
  }

  setPlayerCarColor(hex) {
    this.playerCar.setColor(hex);
  }

  setDifficulty(level) {
    for (const ai of this.aiControllers) {
      ai.setDifficulty(level);
    }
  }

  toggleShadows(enabled) {
    this.renderer.shadowMap.enabled = enabled;
    this.weather.sunLight.castShadow = enabled;
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.ui.showPauseMenu();
    } else {
      this.ui.hidePauseMenu();
      this.lastTime = performance.now();
    }
  }

  resetPlayerCar() {
    // Reset car onto nearest road segment or start line
    const startWp = this.road.raceWaypoints[0];
    this.playerCar.reset(startWp.x, startWp.z, Math.PI);
    this.ui.notify('VEHICLE RESET', 1500);
  }

  restartCurrentMode() {
    this.isPaused = false;
    this.lastTime = performance.now();
    this.raceManager.startMode(this.raceManager.mode);
  }

  animate(currentTime) {
    requestAnimationFrame(this.animate);

    // FIX 3: Compute raw delta and clamp hard to prevent physics blow-ups on tab switch
    const rawDt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    // Hard clamp: never simulate more than 80ms at once
    const clampedDt = Math.min(0.08, rawDt);

    // FIX 3: Exponential moving average for smooth, stutter-resistant delta time
    this.smoothDt = this.smoothDt + (clampedDt - this.smoothDt) * this.dtSmoothing;
    // Use smoothed dt for physics, capped to prevent integration instability
    const dt = Math.min(0.05, this.smoothDt);

    if (this.isPaused) return;

    // 1. Process Input (pass real dt for frame-rate-independent steering smoothing)
    this.input.update(dt);

    if (this.input.consumePauseToggle()) {
      if (this.raceManager.mode !== 'free_drive' || !this.ui.dom.mainMenu.classList.contains('hidden')) {
        this.togglePause();
      }
    }

    if (this.input.consumeCameraToggle()) {
      const mode = this.cameraController.nextMode();
      this.ui.showCameraIndicator(mode);
    }

    if (this.input.consumeHeadlightsToggle()) {
      this.playerCar.toggleHeadlights();
    }

    if (this.input.consumeResetCar()) {
      this.resetPlayerCar();
    }

    if (this.input.consumeMapToggle()) {
      this.ui.toggleWorldMap();
    }

    // 2. Update Player Car
    // Lock controls during countdown
    const canDrive = this.raceManager.state !== 'countdown' && this.raceManager.state !== 'finished';
    const driveInput = canDrive ? this.input : { throttle: 0, brake: 0, steering: 0, handbrake: false, nitro: false };

    this.playerCar.update(dt, driveInput, this.road);

    // 3. Update AI Rival Racers
    if (this.raceManager.mode === 'circuit' || this.raceManager.mode === 'sprint') {
      const allAICars = this.aiCars;
      for (const ai of this.aiControllers) {
        if (canDrive) {
          ai.update(dt, this.playerCar, allAICars, this.road);
        }
        // AI vs Player vehicle collision
        this.physics.resolveVehicleVsVehicle(this.playerCar, ai.car);
      }
      // AI vs AI collision
      for (let i = 0; i < this.aiCars.length; i++) {
        for (let j = i + 1; j < this.aiCars.length; j++) {
          this.physics.resolveVehicleVsVehicle(this.aiCars[i], this.aiCars[j]);
        }
      }
    }

    // 4. Update Ambient Traffic
    this.traffic.update(dt, this.playerCar);

    // 5. Update Racing Logic & Progression
    this.raceManager.update(dt);

    // 6. Update Particles, Dynamic Weather & World Beacon
    this.particles.update(dt, this.camera, this.playerCar.position);
    this.weather.update(this.playerCar.position);
    this.world.update(dt);

    // 7. Update Camera
    this.cameraController.update(dt);

    // 8. Update HUD & Minimap
    this.ui.updateHUD(this.playerCar, this.raceManager);

    // 9. Render Scene
    this.renderer.render(this.scene, this.camera);
  }
}

window.Game = Game;
