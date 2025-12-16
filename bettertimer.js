function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRetryDelay(attempt) {
    if (attempt <= 3) return 3_000;  // first 3 attempts every 3 seconds
    if (attempt <= 9) return 10_000; // next 6 attempts every 10 seconds
    return 30_000; // all remaining attempts every 30 seconds
}

async function fetchAndSetEndTimeWithRetry() {
    let retryCount = 0;
    while (true) {
        let data = null; // for logging in catch
        try {
            const response = await fetch('https://poketwitch.bframework.de/info/events/last_spawn/');
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            data = await response.json();
            if ( typeof data.next_spawn !== 'number' || !Number.isFinite(data.next_spawn) || data.next_spawn < 0 ) {
                throw new Error('Invalid next_spawn');
            }
            const endTime = Date.now() + data.next_spawn * 1000;
            localStorage.setItem('endTime', String(endTime));
            // Success, exit retry loop
            retryCount = 0;
            return;
        } catch (error) {
            console.error('Failed to fetch remaining time:', error);
            console.error('Received data:', data);
            retryCount++;
            const retryDelay = getRetryDelay(retryCount);
            console.log(`Retry #${retryCount}, waiting ${retryDelay} ms before next attempt`);
            await delay(retryDelay);
        }
    }
}

/*
// old function without error and retry logic
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
*/

function getRemainingTime() {
  const endTime = Number(localStorage.getItem('endTime'));
  if (!Number.isFinite(endTime)) {
      // invalid state, handle it
    return 0; // i dunno what else to do, this will cause the logic back to fetchAndSetEndTimeWithRetry eventually
  }
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
    if (remainingTime == 5) {
      // Check for Vibration API support
      if ('vibrate' in navigator) {
        // Vibrate the phone for 5 seconds
        navigator.vibrate(5000);
      } else {
        // Vibration not supported
        console.log("Vibration not supported in this browser.");
      }
    }
  }
  await delay(3000);
  await fetchAndSetEndTimeWithRetry();
  startCountdownLoop();
}

window.addEventListener('load', async () => {
  await fetchAndSetEndTimeWithRetry();
  startCountdownLoop().catch(console.error);
});
