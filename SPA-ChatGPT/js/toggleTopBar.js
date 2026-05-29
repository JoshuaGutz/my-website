// toggleTopBar.js

// Wait until the DOM is fully loaded before setting up the function
// This ensures #top-bar exists before we try to manipulate it
document.addEventListener("DOMContentLoaded", () => {
  // Define toggleTopBar as a global function so it can be called from HTML onclick
  window.toggleTopBar = function () {
    const topBar = document.getElementById("top-bar");
    if (!topBar) return; // Fail gracefully if top bar is not found

    // Toggle display between 'none' and 'flex'
    topBar.style.display = topBar.style.display === "none" ? "flex" : "none";
  };
});
