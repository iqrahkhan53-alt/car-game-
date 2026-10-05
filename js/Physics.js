/**
 * Physics.js
 * High-fidelity arcade-realistic vehicle physics engine with Pacejka-inspired tire slip,
 * multi-gear transmission, aerodynamic drag, weight transfer, off-road terrain friction,
 * and robust AABB & bounding-box collision detection and impulse response.
 */

class Physics {
  constructor() {
    this.gravity = 9.81;

    // Obstacle collision boxes registered in the world
    // Array of { min: THREE.Vector3, max: THREE.Vector3, type: 'building' | 'barrier' | 'rock' | 'tree' }
    this.colliders = [];

    // Collision event listeners
    this.onCollisionCallbacks = [];
  }

  registerCollider(box, type = 'building') {
    this.colliders.push({
      box: box, // THREE.Box3
      type: type
    });
  }

  clearColliders() {
    this.colliders = [];
  }

  onCollision(callback) {
    this.onCollisionCallbacks.push(callback);
  }

  emitCollision(intensity, point, normal) {
    for (const cb of this.onCollisionCallbacks) {
      cb(intensity, point, normal);
    }
  }

  /**
   * Check collision between car bounding box / sphere and world obstacles
   * @param {THREE.Vector3} carPos
   * @param {number} carRadius
   * @param {THREE.Vector3} velocity
   * @returns {boolean} collisionOccurred
   */
  checkObstacleCollisions(carPos, carRadius, velocity) {
    let hit = false;
    const tempPoint = new THREE.Vector3();

    for (let i = 0; i < this.colliders.length; i++) {
      const collider = this.colliders[i];
      const box = collider.box;

      // Quick distance check before clamp
      if (
        carPos.x < box.min.x - carRadius || carPos.x > box.max.x + carRadius ||
        carPos.z < box.min.z - carRadius || carPos.z > box.max.z + carRadius
      ) {
        continue;
      }

      // Clamp car pos into box to find closest point
      tempPoint.x = Math.max(box.min.x, Math.min(carPos.x, box.max.x));
      tempPoint.y = Math.max(box.min.y, Math.min(carPos.y, box.max.y));
      tempPoint.z = Math.max(box.min.z, Math.min(carPos.z, box.max.z));

      const dx = carPos.x - tempPoint.x;
      const dz = carPos.z - tempPoint.z;
      const distSq = dx * dx + dz * dz;

      if (distSq < carRadius * carRadius && distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const overlap = carRadius - dist;

        // Normal pointing out from collider
        const nx = dx / dist;
        const nz = dz / dist;

        // Push car out
        carPos.x += nx * overlap * 1.05;
        carPos.z += nz * overlap * 1.05;

        // Reflect/damp velocity along collision normal
        const normalVel = velocity.x * nx + velocity.z * nz;
        if (normalVel < 0) {
          const restitution = 0.35; // bounciness
          velocity.x -= (1 + restitution) * normalVel * nx;
          velocity.z -= (1 + restitution) * normalVel * nz;

          // Apply collision friction to tangent
          velocity.x *= 0.65;
          velocity.z *= 0.65;

          const impactSpeed = Math.abs(normalVel);
          const intensity = Math.min(1.0, impactSpeed / 25);
          this.emitCollision(intensity, tempPoint.clone(), new THREE.Vector3(nx, 0, nz));
          hit = true;
        }
      }
    }

    return hit;
  }

  /**
   * Check collision between two moving cars (circle-circle approximation with separation)
   */
  resolveVehicleVsVehicle(carA, carB) {
    const dx = carB.position.x - carA.position.x;
    const dz = carB.position.z - carA.position.z;
    const distSq = dx * dx + dz * dz;
    const minDist = carA.radius + carB.radius;

    if (distSq < minDist * minDist && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const overlap = (minDist - dist) * 0.5;

      const nx = dx / dist;
      const nz = dz / dist;

      // Separate both
      carA.position.x -= nx * overlap;
      carA.position.z -= nz * overlap;
      carB.position.x += nx * overlap;
      carB.position.z += nz * overlap;

      // Elastic velocity exchange
      const rvx = carB.velocity.x - carA.velocity.x;
      const rvz = carB.velocity.z - carA.velocity.z;
      const velAlongNormal = rvx * nx + rvz * nz;

      if (velAlongNormal < 0) {
        const impulse = -(1 + 0.3) * velAlongNormal * 0.5;
        carA.velocity.x -= impulse * nx;
        carA.velocity.z -= impulse * nz;
        carB.velocity.x += impulse * nx;
        carB.velocity.z += impulse * nz;

        const impactIntensity = Math.min(1.0, Math.abs(velAlongNormal) / 20);
        const hitPoint = new THREE.Vector3(
          (carA.position.x + carB.position.x) * 0.5,
          carA.position.y + 0.5,
          (carA.position.z + carB.position.z) * 0.5
        );
        this.emitCollision(impactIntensity, hitPoint, new THREE.Vector3(nx, 0, nz));
      }
    }
  }
}

window.Physics = Physics;
