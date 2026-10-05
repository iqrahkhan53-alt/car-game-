/**
 * TrafficManager.js
 * Ambient civilian traffic system for downtown avenues and highways.
 * Generates sedans, SUVs, and city cabs that cruise along lanes and collide realistically with the player.
 */

class TrafficManager {
  constructor(scene, physics) {
    this.scene = scene;
    this.physics = physics;
    this.vehicles = [];

    this.initTraffic();
  }

  initTraffic() {
    this.trafficGroup = new THREE.Group();
    this.scene.add(this.trafficGroup);

    // Common materials
    this.wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
    this.glassMat = new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.1, metalness: 0.5 });
    this.headlightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4cc, emissiveIntensity: 1.2 });
    this.taillightMat = new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff0022, emissiveIntensity: 0.9 });

    // Define traffic paths (looping routes along central boulevard and 1st/2nd avenues)
    this.routes = [
      // Central Blvd Northbound (Lane X: -5)
      {
        start: new THREE.Vector3(-5, 0, 320),
        end: new THREE.Vector3(-5, 0, -320),
        speed: 15.0
      },
      // Central Blvd Southbound (Lane X: 5)
      {
        start: new THREE.Vector3(5, 0, -320),
        end: new THREE.Vector3(5, 0, 320),
        speed: 16.0
      },
      // 1st Avenue Eastbound (Lane Z: -154)
      {
        start: new THREE.Vector3(-240, 0, -154),
        end: new THREE.Vector3(240, 0, -154),
        speed: 14.0
      },
      // 1st Avenue Westbound (Lane Z: -146)
      {
        start: new THREE.Vector3(240, 0, -146),
        end: new THREE.Vector3(-240, 0, -146),
        speed: 14.5
      },
      // 2nd Avenue Eastbound (Lane Z: 146)
      {
        start: new THREE.Vector3(-240, 0, 146),
        end: new THREE.Vector3(240, 0, 146),
        speed: 15.5
      },
      // 2nd Avenue Westbound (Lane Z: 154)
      {
        start: new THREE.Vector3(240, 0, 154),
        end: new THREE.Vector3(-240, 0, 154),
        speed: 13.5
      }
    ];

    // Spawn 12 ambient civilian vehicles
    const carColors = [0xf5f6fa, 0x2f3640, 0x3b82f6, 0xef4444, 0xf59e0b, 0x10b981];

    for (let i = 0; i < 12; i++) {
      const route = this.routes[i % this.routes.length];
      const color = carColors[i % carColors.length];
      const isTaxi = (i === 4 || i === 9); // Yellow taxi cabs

      const veh = this.createCivilianVehicle(color, isTaxi);
      const progress = (i * 0.18 + Math.random() * 0.1) % 1.0;
      const initialPos = new THREE.Vector3().lerpVectors(route.start, route.end, progress);

      veh.group.position.copy(initialPos);

      // Heading direction
      const angle = Math.atan2(route.end.x - route.start.x, route.end.z - route.start.z);
      veh.group.rotation.y = angle;

      this.vehicles.push({
        group: veh.group,
        wheels: veh.wheels,
        route: route,
        progress: progress,
        speed: route.speed,
        radius: 1.4,
        position: veh.group.position,
        velocity: new THREE.Vector3(
          Math.sin(angle) * route.speed,
          0,
          Math.cos(angle) * route.speed
        )
      });
    }
  }

  createCivilianVehicle(colorHex, isTaxi = false) {
    const group = new THREE.Group();

    // Body material
    const paintColor = isTaxi ? 0xfecb02 : colorHex;
    const bodyMat = new THREE.MeshStandardMaterial({
      color: paintColor,
      metalness: 0.6,
      roughness: 0.35
    });

    // Lower Chassis
    const lower = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 4.2), bodyMat);
    lower.position.y = 0.5;
    lower.castShadow = true;
    group.add(lower);

    // Cabin Greenhouse
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 2.3), this.glassMat);
    cabin.position.set(0, 0.95, -0.15);
    cabin.castShadow = true;
    group.add(cabin);

    // Roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.05, 2.1), bodyMat);
    roof.position.set(0, 1.25, -0.15);
    group.add(roof);

    // Taxi roof sign
    if (isTaxi) {
      const signMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffea00, emissiveIntensity: 1.0 });
      const sign = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.22, 0.35), signMat);
      sign.position.set(0, 1.38, -0.15);
      group.add(sign);
    }

    // Headlights & Taillights
    [-0.65, 0.65].forEach(x => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.08), this.headlightMat);
      hl.position.set(x, 0.52, -2.12);
      group.add(hl);

      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.08), this.taillightMat);
      tl.position.set(x, 0.58, 2.12);
      group.add(tl);
    });

    // 4 Wheels
    const wheels = [];
    const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.28, 16);
    wheelGeo.rotateZ(Math.PI / 2);

    [
      { x: -0.92, z: -1.25 },
      { x: 0.92, z: -1.25 },
      { x: -0.92, z: 1.25 },
      { x: 0.92, z: 1.25 }
    ].forEach(w => {
      const wheel = new THREE.Mesh(wheelGeo, this.wheelMat);
      wheel.position.set(w.x, 0.34, w.z);
      wheel.castShadow = true;
      group.add(wheel);
      wheels.push(wheel);
    });

    this.trafficGroup.add(group);
    return { group, wheels };
  }

  update(dt, playerCar) {
    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      const route = v.route;
      const totalDist = route.start.distanceTo(route.end);

      v.progress += (v.speed * dt) / totalDist;
      if (v.progress >= 1.0) {
        v.progress = 0;
      }

      // Interpolate position along route
      v.position.lerpVectors(route.start, route.end, v.progress);

      // Rotate wheels with movement
      const rollAngle = (v.speed * dt) / 0.34;
      for (const w of v.wheels) {
        w.rotation.x += rollAngle;
      }

      // Collision check with player car
      if (playerCar) {
        this.physics.resolveVehicleVsVehicle(playerCar, v);
      }
    }
  }
}

window.TrafficManager = TrafficManager;
