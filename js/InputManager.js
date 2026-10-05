/**
 * InputManager.js
 * Comprehensive input handler for keyboard, touch controls, and UI buttons.
 * Supports smooth state tracking, key-down edge detection, and input mapping.
 */

class InputManager {
  constructor() {
    this.keys = {};
    this.justPressed = {};
    this.touches = {};

    // Input state values normalized (-1 to 1 or 0 to 1)
    this.throttle = 0;   // 0 to 1
    this.brake = 0;      // 0 to 1 (or reverse)
    this.steering = 0;   // -1 (left) to 1 (right)
    this.handbrake = false;
    this.nitro = false;
    this.headlightsToggle = false;
    this.cameraToggle = false;
    this.resetCar = false;
    this.pauseToggle = false;
    this.mapToggle = false;

    // Mobile / touch virtual controls
    this.virtualControlsActive = false;

    this.init();
  }

  init() {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
    window.addEventListener('blur', () => this.reset());

    // Prevent default scrolling for game keys
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
    }, { passive: false });
  }

  onKeyDown(e) {
    const code = e.code;
    if (!this.keys[code]) {
      this.justPressed[code] = true;
    }
    this.keys[code] = true;

    // Direct toggles on keydown edge
    if (code === 'KeyC') {
      this.cameraToggle = true;
    }
    if (code === 'KeyH') {
      this.headlightsToggle = true;
    }
    if (code === 'KeyR') {
      this.resetCar = true;
    }
    if (code === 'KeyP' || code === 'Escape') {
      this.pauseToggle = true;
    }
    if (code === 'KeyM') {
      this.mapToggle = true;
    }
  }

  onKeyUp(e) {
    this.keys[e.code] = false;
  }

  isDown(code) {
    return !!this.keys[code];
  }

  wasJustPressed(code) {
    const val = !!this.justPressed[code];
    this.justPressed[code] = false;
    return val;
  }

  update(dt = 0.016) {
    // Determine throttle (W, ArrowUp)
    const forward = this.isDown('KeyW') || this.isDown('ArrowUp');
    const backward = this.isDown('KeyS') || this.isDown('ArrowDown');
    const left = this.isDown('KeyA') || this.isDown('ArrowLeft');
    const right = this.isDown('KeyD') || this.isDown('ArrowRight');

    this.throttle = forward ? 1.0 : 0.0;
    this.brake = backward ? 1.0 : 0.0;

    // FIX 2: Progressive steering input with return-to-center spring (uses real dt)
    // A/Left = -1 (turn left), D/Right = +1 (turn right)
    let targetSteer = 0;
    if (left)  targetSteer -= 1.0;
    if (right) targetSteer += 1.0;

    // FIX 2: Smooth ramp using real dt — attack: 7.0/s, return to center: 16.0/s
    const steerSpeed = targetSteer === 0 ? 16.0 : 7.0;
    this.steering += (targetSteer - this.steering) * Math.min(1.0, steerSpeed * dt);

    // Hard snap to zero when near center
    if (targetSteer === 0 && Math.abs(this.steering) < 0.003) {
      this.steering = 0;
    }

    this.handbrake = this.isDown('Space');
    this.nitro = this.isDown('ShiftLeft') || this.isDown('ShiftRight');
  }

  consumeCameraToggle() {
    const val = this.cameraToggle;
    this.cameraToggle = false;
    return val;
  }

  consumeHeadlightsToggle() {
    const val = this.headlightsToggle;
    this.headlightsToggle = false;
    return val;
  }

  consumeResetCar() {
    const val = this.resetCar;
    this.resetCar = false;
    return val;
  }

  consumePauseToggle() {
    const val = this.pauseToggle;
    this.pauseToggle = false;
    return val;
  }

  consumeMapToggle() {
    const val = this.mapToggle;
    this.mapToggle = false;
    return val;
  }

  reset() {
    this.keys = {};
    this.justPressed = {};
    this.throttle = 0;
    this.brake = 0;
    this.steering = 0;
    this.handbrake = false;
    this.nitro = false;
    this.cameraToggle = false;
    this.headlightsToggle = false;
    this.resetCar = false;
    this.pauseToggle = false;
    this.mapToggle = false;
  }
}

window.InputManager = InputManager;
