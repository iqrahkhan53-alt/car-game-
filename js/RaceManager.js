/**
 * RaceManager.js
 * Comprehensive racing logic, game modes, checkpoint gates, lap counters,
 * starting countdowns, real-time leaderboard positioning, and results management.
 */

class RaceManager {
  constructor(scene, roadSystem, audioManager, uiManager) {
    this.scene = scene;
    this.road = roadSystem;
    this.audio = audioManager;
    this.ui = uiManager;

    this.mode = 'free_drive'; // 'free_drive' | 'circuit' | 'sprint' | 'time_trial' | 'checkpoint' | 'speed'
    this.state = 'idle'; // 'countdown' | 'racing' | 'finished' | 'idle'

    // Race progression
    this.currentLap = 1;
    this.totalLaps = 3;
    this.currentCheckpointIndex = 0;
    this.raceTimer = 0;
    this.lapTimer = 0;
    this.bestLapTime = Infinity;
    this.lastLapTime = 0;
    this.playerPosition = 1;

    // Checkpoint Challenge specific
    this.challengeTimeLeft = 30.0;

    // Speed Challenge specific
    this.speedTrapRecord = 0;

    // Countdown state
    this.countdownTimer = 3.5;
    this.lastCountdownBeep = -1;

    // Visual Checkpoint Gates in 3D
    this.checkpointGates = [];
    this.initCheckpointVisuals();

    // AI Racers reference
    this.aiControllers = [];
    this.playerCar = null;
  }

  setReferences(playerCar, aiControllers, uiManager) {
    this.playerCar = playerCar;
    this.aiControllers = aiControllers;
    this.ui = uiManager;
  }

  initCheckpointVisuals() {
    this.gateGroup = new THREE.Group();
    this.scene.add(this.gateGroup);

    // Holographic gate materials
    this.gateMatActive = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00d4ff,
      emissiveIntensity: 2.5,
      transparent: true,
      opacity: 0.85
    });

    this.gateMatInactive = new THREE.MeshStandardMaterial({
      color: 0x334455,
      emissive: 0x112233,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.35
    });

    this.gateMatFinish = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xff8800,
      emissiveIntensity: 3.0,
      transparent: true,
      opacity: 0.95
    });

    // Ring Geometry for holographic gate
    const ringGeo = new THREE.TorusGeometry(8.5, 0.45, 12, 32);
    const pillarGeo = new THREE.CylinderGeometry(0.3, 0.3, 10, 8);

    // Build visual gates for each waypoint
    const waypoints = this.road.raceWaypoints;
    for (let i = 0; i < waypoints.length; i++) {
      const wp = waypoints[i];
      const nextWp = waypoints[(i + 1) % waypoints.length];
      const angle = Math.atan2(nextWp.x - wp.x, nextWp.z - wp.z);

      const gate = new THREE.Group();
      gate.position.set(wp.x, 0, wp.z);
      gate.rotation.y = angle;

      // Gate ring
      const ring = new THREE.Mesh(ringGeo, i === 0 ? this.gateMatFinish : this.gateMatInactive);
      ring.position.y = 5.0;
      gate.add(ring);

      // Left and right light pillars
      const pL = new THREE.Mesh(pillarGeo, this.gateMatActive);
      pL.position.set(-8.5, 5, 0);
      const pR = new THREE.Mesh(pillarGeo, this.gateMatActive);
      pR.position.set(8.5, 5, 0);
      gate.add(pL, pR);

      this.gateGroup.add(gate);
      this.checkpointGates.push({
        group: gate,
        ring: ring,
        position: wp,
        radius: 14.0
      });
    }

    this.updateCheckpointGateColors();
  }

  updateCheckpointGateColors() {
    for (let i = 0; i < this.checkpointGates.length; i++) {
      const gate = this.checkpointGates[i];
      if (this.mode === 'free_drive') {
        gate.group.visible = false;
        continue;
      }

      gate.group.visible = true;
      if (i === this.currentCheckpointIndex) {
        gate.ring.material = (i === 0) ? this.gateMatFinish : this.gateMatActive;
        gate.ring.scale.set(1.15, 1.15, 1.15);
      } else {
        gate.ring.material = this.gateMatInactive;
        gate.ring.scale.set(1.0, 1.0, 1.0);
      }
    }
  }

  startMode(modeName) {
    this.mode = modeName;
    this.currentLap = 1;
    this.currentCheckpointIndex = 0;
    this.raceTimer = 0;
    this.lapTimer = 0;
    this.bestLapTime = Infinity;
    this.lastLapTime = 0;
    this.challengeTimeLeft = 35.0;

    const startPos = this.road.raceWaypoints[0];

    // Reset player position at start line
    if (this.playerCar) {
      this.playerCar.reset(startPos.x, startPos.z, Math.PI);
    }

    // Reset AI racers on starting grid slots behind / beside player
    const gridOffsets = [
      { x: 5, z: 12 },
      { x: -5, z: 22 },
      { x: 4, z: 32 }
    ];

    if (this.aiControllers) {
      this.aiControllers.forEach((ai, idx) => {
        const off = gridOffsets[idx % gridOffsets.length];
        ai.car.reset(startPos.x + off.x, startPos.z + off.z, Math.PI);
        ai.currentWaypointIndex = 1;
        ai.lap = 1;
        ai.totalDistanceTravelled = 0;
      });
    }

    if (modeName === 'free_drive') {
      this.state = 'racing';
      this.updateCheckpointGateColors();
      if (this.ui) this.ui.showModeHUD(modeName);
      return;
    }

    // Start 3-second countdown for competitive modes
    this.state = 'countdown';
    this.countdownTimer = 3.6;
    this.lastCountdownBeep = -1;
    this.updateCheckpointGateColors();

    if (this.ui) {
      this.ui.showModeHUD(modeName);
      this.ui.showCountdown(3);
    }
  }

  update(dt) {
    // 1. Holographic gates rotation animation
    for (let i = 0; i < this.checkpointGates.length; i++) {
      const g = this.checkpointGates[i];
      if (g.group.visible) {
        g.ring.rotation.z += dt * 1.2;
      }
    }

    if (this.state === 'countdown') {
      this.countdownTimer -= dt;
      const countInt = Math.ceil(this.countdownTimer);

      if (countInt > 0 && countInt !== this.lastCountdownBeep) {
        this.lastCountdownBeep = countInt;
        if (this.audio) this.audio.playCountdown(false);
        if (this.ui) this.ui.showCountdown(countInt);
      }

      if (this.countdownTimer <= 0) {
        this.state = 'racing';
        if (this.audio) this.audio.playCountdown(true);
        if (this.ui) {
          this.ui.showCountdown('GO!');
          setTimeout(() => this.ui.hideCountdown(), 1000);
        }
      }
      return;
    }

    if (this.state !== 'racing') return;

    // Increment Timers
    this.raceTimer += dt;
    this.lapTimer += dt;

    // Checkpoint Challenge Mode timer depletion
    if (this.mode === 'checkpoint') {
      this.challengeTimeLeft -= dt;
      if (this.challengeTimeLeft <= 0) {
        this.finishRace(false, 'TIME OVER!');
        return;
      }
    }

    // Speed Challenge Trap Check
    if (this.mode === 'speed') {
      const spd = Math.abs(this.playerCar.speedKmh);
      if (spd > this.speedTrapRecord) {
        this.speedTrapRecord = Math.floor(spd);
        if (this.ui) this.ui.notify(`NEW TOP SPEED: ${this.speedTrapRecord} KM/H!`, 1500);
      }
    }

    // 2. Checkpoint Hit Detection
    if (this.playerCar && this.checkpointGates.length > 0) {
      const targetGate = this.checkpointGates[this.currentCheckpointIndex];
      const pPos = this.playerCar.position;
      const gPos = targetGate.position;

      const dist = Math.hypot(pPos.x - gPos.x, pPos.z - gPos.z);
      if (dist < targetGate.radius) {
        this.onCheckpointPassed();
      }
    }

    // 3. Leaderboard Position Calculation (1st, 2nd, 3rd, 4th)
    this.calculatePositions();
  }

  onCheckpointPassed() {
    if (this.audio) this.audio.playCheckpoint();

    if (this.mode === 'checkpoint') {
      this.challengeTimeLeft += 7.0; // Bonus seconds
      if (this.ui) this.ui.notify('+7 SECONDS BONUS!', 1200);
    }

    this.currentCheckpointIndex++;

    // Completed full lap!
    if (this.currentCheckpointIndex >= this.checkpointGates.length) {
      this.currentCheckpointIndex = 0;
      this.onLapCompleted();
    }

    this.updateCheckpointGateColors();
  }

  onLapCompleted() {
    this.lastLapTime = this.lapTimer;
    if (this.lapTimer < this.bestLapTime) {
      this.bestLapTime = this.lapTimer;
      if (this.ui) this.ui.notify(`NEW BEST LAP: ${this.formatTime(this.bestLapTime)}`, 2000);
    }
    this.lapTimer = 0;

    if (this.mode === 'circuit') {
      if (this.currentLap >= this.totalLaps) {
        this.finishRace(true);
        return;
      }
      this.currentLap++;
    } else if (this.mode === 'sprint' || this.mode === 'time_trial') {
      this.finishRace(true);
    }
  }

  calculatePositions() {
    if (!this.playerCar || !this.aiControllers || this.aiControllers.length === 0) {
      this.playerPosition = 1;
      return;
    }

    // Calculate effective progress of player
    const playerProgress = (this.currentLap - 1) * this.checkpointGates.length + this.currentCheckpointIndex;

    let rank = 1;
    for (const ai of this.aiControllers) {
      const aiProgress = (ai.lap - 1) * this.checkpointGates.length + ai.currentWaypointIndex;
      if (aiProgress > playerProgress) {
        rank++;
      }
    }
    this.playerPosition = rank;
  }

  finishRace(success = true, customMsg = null) {
    this.state = 'finished';

    const results = {
      success: success,
      mode: this.mode,
      position: this.playerPosition,
      totalTime: this.formatTime(this.raceTimer),
      bestLap: this.bestLapTime !== Infinity ? this.formatTime(this.bestLapTime) : '--:--',
      customMsg: customMsg
    };

    if (this.ui) {
      this.ui.showRaceResults(results);
    }
  }

  formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }
}

window.RaceManager = RaceManager;
