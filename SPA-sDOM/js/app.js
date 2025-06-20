document.addEventListener('DOMContentLoaded', () => {
    const appPageSections = document.querySelectorAll('.app-page-section');
    const navItems = document.querySelectorAll('.nav-link, .nav-button');

    // Object to hold initialization and cleanup functions for each page
    // Keys should match the section IDs (without '-section') and data-path attributes
    const pageModules = {
        'chat': {
            init: window.initChatPage,    // Function from chat.js
            cleanup: window.cleanupChatPage // Function from chat.js
        }
        // Add other page modules here if they need specific init/cleanup
        // 'home': { init: window.initHomePage, cleanup: window.cleanupHomePage },
        // 'about': { init: window.initAboutPage, cleanup: window.cleanupAboutPage }
    };

    let currentPageId = null; // Stores the ID of the currently active page section (e.g., 'home-page-section')
    let currentPageCleanupFunction = null; // Stores the cleanup function for the currently active page

    /**
     * Shows a specific page section and hides all others.
     * Manages page-specific JavaScript initialization and cleanup.
     * @param {string} targetPath - The data-path of the page to show (e.g., 'home', 'chat').
     */
    function showPage(targetPath) {
        const targetSectionId = `${targetPath}-page-section`;
        const targetSection = document.getElementById(targetSectionId);

        if (!targetSection) {
            console.error(`Page section with ID "${targetSectionId}" not found.`);
            // Handle error: maybe redirect to home or show an error page
            showPage('home'); // Fallback to home page
            return;
        }

        // 1. Cleanup old page's JavaScript (if any and if it's a different page)
        if (currentPageId && currentPageId !== targetSectionId) {
            const oldPagePath = currentPageId.replace('-page-section', '');
            if (pageModules[oldPagePath] && pageModules[oldPagePath].cleanup) {
                console.log(`Cleaning up ${oldPagePath} page...`);
                pageModules[oldPagePath].cleanup();
            }
        }

        // 2. Hide all page sections
        appPageSections.forEach(section => {
            section.classList.remove('active-page');
            section.style.display = 'none'; // Ensure it's hidden
        });

        // 3. Show the target page section
        targetSection.classList.add('active-page');
        targetSection.style.display = 'block'; // Ensure it's visible

        // 4. Update navigation highlighting
        navItems.forEach(item => {
            if (item.classList.contains('nav-link')) {
                item.classList.remove('active');
            }
        });
        const currentNavLink = document.querySelector(`.nav-link[data-path="${targetPath}"]`);
        if (currentNavLink) {
            currentNavLink.classList.add('active');
        }

        // 5. Initialize new page's JavaScript (if any)
        if (pageModules[targetPath] && pageModules[targetPath].init) {
            console.log(`Initializing ${targetPath} page...`);
            pageModules[targetPath].init();
        }

        // Update current page tracking
        currentPageId = targetSectionId;
        document.title = `My Site - ${targetPath.charAt(0).toUpperCase() + targetPath.slice(1)}`;
    }

    // Handle navigation clicks
    navItems.forEach(item => {
        if (item.dataset.path) { // For navigation links
            item.addEventListener('click', (event) => {
                event.preventDefault(); // Prevent default link behavior
                const path = event.currentTarget.dataset.path;
                history.pushState({ path: path }, '', `#${path}`); // Update URL
                showPage(path); // Show the new page
            });
        }
        // The toggle-top-bar button logic remains in toggleTopBar.js
    });

    // Handle initial page load and back/forward button events
    const initialPath = window.location.hash.substring(1) || 'home';
    showPage(initialPath); // Show the initial page

    window.addEventListener('popstate', (event) => {
        const path = event.state && event.state.path ? event.state.path : 'home';
        showPage(path);
    });
});
