function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchAndSetEndTime() {
    try {
        const response = await fetch('https://poketwitch.bframework.de/info/events/last_spawn/');
        const data = await response.json();

        const now = Date.now(); // Current time in milliseconds
        const remainingTimeInMs = data.next_spawn * 1000; // Convert seconds to ms
        const endTime = now + remainingTimeInMs;

        localStorage.setItem('endTime', endTime);
    } catch (error) {
        console.error('Failed to fetch remaining time:', error);
    }
}

function getRemainingTime() {
  const endTime = localStorage.getItem('endTime');
  if (!endTime) return 0; // fallback if endTime hasn't been set yet

  const now = Date.now();
  const remainingMs = endTime - now;
  return Math.max(0, Math.floor(remainingMs / 1000)); // Never return negative
}

function formatTime(seconds) {
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

function updateCountdownDisplay(remainingSeconds) {
  const countdownElement = document.getElementById('countdown');
  countdownElement.textContent = formatTime(remainingSeconds);
}

async function startCountdownLoop() {
  let remainingTime = getRemainingTime();
  updateCountdownDisplay(remainingTime);
  while (remainingTime > 0 && remainingTime != 15) {
    await delay(1000);
    remainingTime = getRemainingTime();
    updateCountdownDisplay(remainingTime);
  }
  await delay(3000);
  await fetchAndSetEndTime();
  startCountdownLoop();
}

window.onload = async () => {
  await fetchAndSetEndTime();
  startCountdownLoop().catch(console.error);
};