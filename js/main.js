/**
 * main.js
 * Entry point for 3D Open-World Racing Game.
 * Handles assets/systems preloading animation, instantiates Game,
 * and seamlessly transitions from loader to menu.
 */

window.addEventListener('DOMContentLoaded', () => {
  const loadingBar = document.getElementById('loading-bar-fill');
  const loadingPercent = document.getElementById('loading-percent');
  const loadingText = document.getElementById('loading-text');
  const btnStart = document.getElementById('btn-start-game');

  const loadingSteps = [
    { text: 'INITIALIZING WEBGL 3D PIPELINE...', target: 20 },
    { text: 'BUILDING PROCEDURAL OPEN-WORLD CITY...', target: 45 },
    { text: 'CALCULATING ROAD NETWORK & SUSPENSION BRIDGE...', target: 65 },
    { text: 'SYNTHESIZING PROCEDURAL AUDIO & ENGINE HARMONICS...', target: 85 },
    { text: 'TUNING SPORTS CAR PHYSICS & AERODYNAMICS...', target: 98 },
    { text: 'READY FOR LAUNCH', target: 100 }
  ];

  let currentStep = 0;
  let currentProgress = 0;

  const progressInterval = setInterval(() => {
    const step = loadingSteps[currentStep];
    if (currentProgress < step.target) {
      currentProgress += Math.min(4, step.target - currentProgress);
      if (loadingBar) loadingBar.style.width = `${currentProgress}%`;
      if (loadingPercent) loadingPercent.textContent = `${currentProgress}%`;
      if (loadingText) loadingText.textContent = step.text;
    } else {
      currentStep++;
      if (currentStep >= loadingSteps.length) {
        clearInterval(progressInterval);

        // Instantiate Game
        try {
          window.racingGame = new Game();
        } catch (err) {
          console.error('Failed to initialize 3D Racing Game:', err);
        }

        // Show Ready / Start button
        const loaderContainer = document.querySelector('.loader-progress-box');
        if (loaderContainer) loaderContainer.style.display = 'none';
        if (btnStart) {
          btnStart.classList.remove('hidden');
          btnStart.focus();
        }
      }
    }
  }, 35);
});
