// toggleTopBar.js

document.addEventListener("DOMContentLoaded", () => {
  // Define toggleTopBar as a global function (attached to window)
  // This makes it accessible from other scripts, though not directly called by app.js anymore
  window.toggleTopBar = function () {
    // Toggle the 'top-bar-hidden' class on the body element
    // CSS rules will then handle the hiding/showing and layout adjustments
    document.body.classList.toggle('top-bar-hidden');
  };

  // Select the "Timer" button specifically
  const timerButton = document.querySelector('.nav-button[data-action="toggle-top-bar"]');

  if (timerButton) {
    // Add a click event listener to the Timer button
    timerButton.addEventListener('click', (event) => {
      // Call the global toggleTopBar function
      window.toggleTopBar();
      // Immediately remove focus from the button after it's clicked
      // This prevents the persistent highlight issue
      event.currentTarget.blur();
    });
  } else {
    console.warn("Timer button with data-action='toggle-top-bar' not found.");
  }
});
