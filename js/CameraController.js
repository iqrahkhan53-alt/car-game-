/**
 * CameraController.js
 * Advanced multi-mode camera rig for sports car racing.
 * Supports 5 distinct camera views with smooth exponential damping, lookahead,
 * dynamic speed FOV scaling, trauma-based camera shake, and zero-GC vector pooling.
 */

// Static reusable vectors to eliminate per-frame GC allocations
const _camForward = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _camIdealPos = new THREE.Vector3();
const _camIdealLook = new THREE.Vector3();

class CameraController {
  constructor(camera, targetCar) {
    this.camera = camera;
    this.car = targetCar;

    this.modes = ['chase', 'cinematic_low', 'hood', 'cockpit', 'orbit'];
    this.modeIndex = 0; // default chase

    // Smoothed target positions
    this.currentPos = new THREE.Vector3(0, 5, 10);
    this.lookTarget = new THREE.Vector3(0, 0, 0);

    // Camera Shake (trauma system)
    this.trauma = 0; // 0 to 1
    this.shakeDecay = 1.8;

    // Base FOV
    this.baseFov = 65;
    this.currentFov = 65;

    // Orbit mode angle for showcase
    this.orbitAngle = 0;

    // Camera Configurations for each mode:
    this.configs = {
      chase: {
        dist: 7.2,
        height: 2.8,
        lookHeight: 1.2,
        posDamping: 6.5,
        rotDamping: 8.5,
        name: '3rd Person Chase'
      },
      cinematic_low: {
        dist: 5.4,
        height: 1.5,
        lookHeight: 0.85,
        posDamping: 8.5,
        rotDamping: 10.5,
        name: 'Cinematic Low'
      },
      hood: {
        dist: 0.2,
        height: 0.82,
        lookHeight: 0.85,
        posDamping: 24.0,
        rotDamping: 24.0,
        name: 'Hood / Bonnet'
      },
      cockpit: {
        dist: -0.28,
        height: 1.14,
        lookHeight: 1.05,
        posDamping: 20.0,
        rotDamping: 20.0,
        name: 'Cockpit View'
      },
      orbit: {
        dist: 12.0,
        height: 4.5,
        lookHeight: 1.0,
        name: 'Cinematic Orbit'
      }
    };
  }

  nextMode() {
    this.modeIndex = (this.modeIndex + 1) % this.modes.length;
    return this.getCurrentModeName();
  }

  setMode(modeName) {
    const idx = this.modes.indexOf(modeName);
    if (idx !== -1) {
      this.modeIndex = idx;
    }
  }

  getCurrentModeName() {
    const key = this.modes[this.modeIndex];
    return this.configs[key].name;
  }

  addTrauma(amount) {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  update(dt) {
    if (!this.car) return;

    const mode = this.modes[this.modeIndex];
    const cfg = this.configs[mode];
    const carPos = this.car.position;
    const heading = this.car.heading;
    const speedKmh = Math.abs(this.car.speedKmh);

    // 1. Dynamic Speed Shake & Trauma Decay
    const speedShake = Math.max(0, (speedKmh - 160) / 280) * 0.22;
    this.trauma = Math.max(0, this.trauma - this.shakeDecay * dt);
    const totalShake = Math.min(1.0, (this.trauma * this.trauma) + speedShake);

    // 2. Dynamic FOV (widens with speed and nitro)
    const nitroBonus = this.car.isNitroActive ? 8.0 : 0;
    const speedFovBonus = Math.min(12.0, (speedKmh / 280) * 12.0);
    const targetFov = this.baseFov + speedFovBonus + nitroBonus;
    this.currentFov += (targetFov - this.currentFov) * (1.0 - Math.exp(-5.0 * dt));
    this.camera.fov = this.currentFov;
    this.camera.updateProjectionMatrix();

    // 3. Compute Orientation Vectors (Zero GC)
    _camForward.set(-Math.sin(heading), 0, -Math.cos(heading));
    _camRight.set(Math.cos(heading), 0, -Math.sin(heading));

    if (mode === 'orbit') {
      this.orbitAngle += dt * 0.35;
      const ox = carPos.x + Math.sin(this.orbitAngle) * cfg.dist;
      const oz = carPos.z + Math.cos(this.orbitAngle) * cfg.dist;
      this.camera.position.set(ox, carPos.y + cfg.height, oz);
      this.camera.lookAt(carPos.x, carPos.y + cfg.lookHeight, carPos.z);
      return;
    }

    // Dynamic distance scaling with speed for chase camera
    const distExtra = mode === 'chase' ? Math.min(2.5, (speedKmh / 250) * 2.5) : 0;
    const actualDist = cfg.dist + distExtra;

    // Ideal camera location
    if (mode === 'hood') {
      _camIdealPos.copy(carPos)
        .addScaledVector(_camForward, 1.2)
        .add({ x: 0, y: cfg.height, z: 0 });
    } else if (mode === 'cockpit') {
      _camIdealPos.copy(carPos)
        .addScaledVector(_camForward, 0.1)
        .addScaledVector(_camRight, -0.35) // driver side
        .add({ x: 0, y: cfg.height, z: 0 });
    } else {
      _camIdealPos.copy(carPos)
        .addScaledVector(_camForward, -actualDist)
        .add({ x: 0, y: cfg.height, z: 0 });
    }

    // Frame-rate independent exponential damping for silky-smooth motion
    const posAlpha = 1.0 - Math.exp(-cfg.posDamping * dt);
    this.currentPos.lerp(_camIdealPos, posAlpha);

    // Ideal look target (look ahead along car heading)
    const lookAheadDist = mode === 'hood' ? 22.0 : (mode === 'cockpit' ? 16.0 : 6.5);
    _camIdealLook.copy(carPos)
      .addScaledVector(_camForward, lookAheadDist)
      .add({ x: 0, y: cfg.lookHeight, z: 0 });

    const rotAlpha = 1.0 - Math.exp(-cfg.rotDamping * dt);
    this.lookTarget.lerp(_camIdealLook, rotAlpha);

    // Apply Camera Shake offsets
    let shakeX = 0;
    let shakeY = 0;
    if (totalShake > 0.001) {
      const shakeMag = totalShake * 0.32;
      shakeX = (Math.random() - 0.5) * shakeMag;
      shakeY = (Math.random() - 0.5) * shakeMag;
    }

    this.camera.position.set(
      this.currentPos.x + shakeX,
      this.currentPos.y + shakeY,
      this.currentPos.z
    );

    this.camera.lookAt(
      this.lookTarget.x,
      this.lookTarget.y,
      this.lookTarget.z
    );
  }
}

window.CameraController = CameraController;
