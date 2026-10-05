/**
 * AIController.js
 * Intelligent autonomous racing driver for rival sports cars.
 * Waypoint navigation, corner braking curves, collision avoidance steering,
 * nitro tactical usage, and track progress tracking.
 */

// Static reusable vectors to avoid GC stutter in AI update loop
const _aiForward = new THREE.Vector3();
const _aiRight = new THREE.Vector3();

class AIController {
  constructor(car, waypoints, difficulty = 'medium') {
    this.car = car;
    this.waypoints = waypoints;
    this.currentWaypointIndex = 0;
    this.lap = 1;
    this.totalDistanceTravelled = 0;

    // Difficulty settings
    this.difficulty = difficulty;
    const diffConfigs = {
      easy: { topSpeedMult: 0.82, cornerSpeed: 70, steerAggression: 0.85 },
      medium: { topSpeedMult: 0.95, cornerSpeed: 92, steerAggression: 1.0 },
      hard: { topSpeedMult: 1.04, cornerSpeed: 110, steerAggression: 1.25 }
    };
    this.diffConfig = diffConfigs[difficulty] || diffConfigs.medium;

    // Virtual inputs fed into car.update()
    this.input = {
      throttle: 0,
      brake: 0,
      steering: 0,
      handbrake: false,
      nitro: false
    };

    // Stagger waypoint tolerance
    this.waypointRadius = 22.0;
  }

  setDifficulty(level) {
    this.difficulty = level;
    if (level === 'easy') this.diffConfig = { topSpeedMult: 0.82, cornerSpeed: 70, steerAggression: 0.85 };
    else if (level === 'hard') this.diffConfig = { topSpeedMult: 1.04, cornerSpeed: 110, steerAggression: 1.25 };
    else this.diffConfig = { topSpeedMult: 0.95, cornerSpeed: 92, steerAggression: 1.0 };
  }

  update(dt, playerCar, otherAICars, roadSystem) {
    if (!this.waypoints || this.waypoints.length === 0) return;

    // 1. Current Target Waypoint
    const targetWp = this.waypoints[this.currentWaypointIndex];
    const carPos = this.car.position;

    // Distance to target waypoint
    const dx = targetWp.x - carPos.x;
    const dz = targetWp.z - carPos.z;
    const distToWp = Math.hypot(dx, dz);

    if (distToWp < this.waypointRadius) {
      this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length;
      if (this.currentWaypointIndex === 0) {
        this.lap++;
      }
    }

    // 2. Steer towards target waypoint in local vehicle coordinates
    // Dot products with car orientation
    const cosH = Math.cos(this.car.heading);
    const sinH = Math.sin(this.car.heading);

    const dotRight = dx * cosH - dz * sinH;
    const dotForward = -dx * sinH - dz * cosH;
    const localTargetAngle = Math.atan2(dotRight, dotForward);

    // Proportional steering control (positive = steer right, negative = steer left)
    let steerInput = THREE.MathUtils.clamp(localTargetAngle * 2.4 * this.diffConfig.steerAggression, -1.0, 1.0);

    // 3. Collision Avoidance (Avoid bumping directly into player or other AI)
    _aiForward.set(-sinH, 0, -cosH);
    _aiRight.set(cosH, 0, -sinH);

    const checkObstacles = [playerCar, ...(otherAICars || [])];
    for (let i = 0; i < checkObstacles.length; i++) {
      const other = checkObstacles[i];
      if (!other || other === this.car) continue;

      const odx = other.position.x - carPos.x;
      const odz = other.position.z - carPos.z;
      const distSq = odx * odx + odz * odz;

      if (distSq < 196.0) { // Within 14 meters
        const oDotF = odx * (-sinH) + odz * (-cosH);
        if (oDotF > 0.5) { // Other car is ahead
          const oDotR = odx * cosH - odz * sinH;
          if (Math.abs(oDotR) < 3.8) {
            // Steer away from other vehicle
            steerInput += (oDotR > 0 ? -0.45 : 0.45);
          }
        }
      }
    }

    this.input.steering = THREE.MathUtils.clamp(steerInput, -1.0, 1.0);

    // 4. Throttle & Braking Strategy
    // Corner speed limit
    const isSharpCorner = Math.abs(localTargetAngle) > 0.42;
    const currentSpeed = Math.abs(this.car.speedKmh);
    const cornerSpeedLimit = this.diffConfig.cornerSpeed;

    if (isSharpCorner && currentSpeed > cornerSpeedLimit) {
      this.input.throttle = 0;
      this.input.brake = 0.85;
      this.input.handbrake = Math.abs(localTargetAngle) > 0.75; // Drift around hairpins
    } else {
      this.input.throttle = 1.0 * this.diffConfig.topSpeedMult;
      this.input.brake = 0;
      this.input.handbrake = false;
    }

    // Tactical Nitro on long straightaways
    const isStraight = Math.abs(localTargetAngle) < 0.12 && distToWp > 70;
    this.input.nitro = isStraight && (Math.random() > 0.25);

    // 5. Update Car simulation
    this.car.update(dt, this.input, roadSystem);

    // Track total distance for race standing computation
    this.totalDistanceTravelled += this.car.velocity.length() * dt;
  }
}

window.AIController = AIController;
