document.addEventListener('DOMContentLoaded', () => {
    const appContent = document.getElementById('app-content');
    const navItems = document.querySelectorAll('.nav-link, .nav-button');

    // Store a reference to the currently active page's cleanup function
    // This will be null if no page-specific cleanup is needed for the current page
    let currentPageCleanupFunction = null;

    /**
     * Loads content dynamically into the app-content area.
     * Fetches HTML snippets based on the provided path.
     * @param {string} path - The path corresponding to the content snippet (e.g., 'home', 'about').
     */
    async function loadContent(path) {
        // --- STEP 1: Perform cleanup for the old page, if any ---
        if (currentPageCleanupFunction && typeof currentPageCleanupFunction === 'function') {
            currentPageCleanupFunction(); // Call cleanup function for the page being exited
            currentPageCleanupFunction = null; // Reset the reference
        }

        // --- STEP 2: Update highlighting for the new page ---
        navItems.forEach(item => {
            if (item.classList.contains('nav-link')) {
                item.classList.remove('active');
            }
        });
        const currentNavLink = document.querySelector(`.nav-link[data-path="${path}"]`);
        if (currentNavLink) {
            currentNavLink.classList.add('active');
        }

        // --- STEP 3: Load new content ---
        try {
            const response = await fetch(`content/${path}.html`);
            if (!response.ok) {
                throw new Error(`Could not load content for ${path}: ${response.statusText}`);
            }
            const html = await response.text();
            appContent.innerHTML = html;

            appContent.className = `page-${path}`;
            document.title = `My Site - ${path.charAt(0).toUpperCase() + path.slice(1)}`;
            appContent.scrollTop = 0;

            // --- STEP 4: Initialize new page's JavaScript, if available ---
            switch (path) {
                case 'chat':
                    // Check if the chat.js script has loaded and exposed initChatPage globally
                    if (window.initChatPage && typeof window.initChatPage === 'function') {
                        window.initChatPage(); // Initialize the chat page
                        currentPageCleanupFunction = window.cleanupChatPage; // Store its cleanup function
                    } else {
                        console.warn("initChatPage function not found. Ensure chat.js is loaded and properly defines it.");
                    }
                    break;
                // Add cases for other pages if they need specific JS initialization
                // case 'page1':
                //     if (window.initPage1 && typeof window.initPage1 === 'function') {
                //         window.initPage1();
                //         currentPageCleanupFunction = window.cleanupPage1;
                //     }
                //     break;
                // case 'home':
                //     if (window.initHomePage && typeof window.initHomePage === 'function') {
                //         window.initHomePage();
                //         currentPageCleanupFunction = window.cleanupHomePage;
                //     }
                //     break;
            }

        } catch (error) {
            console.error('Error loading content:', error);
            appContent.innerHTML = '<p>Error loading content. Please try again.</p>';
            document.title = 'My Site - Error';
            // If content loading fails, we might still want to ensure cleanup happens
            // or consider what the "active" state means for a failed load.
        }
    }

    // Handle navigation clicks for elements with data-path (actual navigation links)
    navItems.forEach(item => {
        if (item.dataset.path) { // Only attach click listener for navigation links
            item.addEventListener('click', (event) => {
                event.preventDefault();
                const path = event.currentTarget.dataset.path;
                history.pushState({ path: path }, '', `#${path}`);
                loadContent(path);
            });
        }
    });

    // Handle initial page load and back/forward button events
    const initialPath = window.location.hash.substring(1) || 'home';
    loadContent(initialPath);

    window.addEventListener('popstate', (event) => {
        const path = event.state && event.state.path ? event.state.path : 'home';
        loadContent(path);
    });
});
