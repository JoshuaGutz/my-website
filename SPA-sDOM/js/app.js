document.addEventListener('DOMContentLoaded', async () => {
    // Application Version - Manually update this string with each significant push to 'main'
    const VERSION = "1.0.0-alpha.5"; // Example: Increment this with each push (e.g., 1.0.0-alpha.1, 1.0.0-alpha.2, etc.)

    const appPageSections = document.querySelectorAll('.app-page-section');
    const navItems = document.querySelectorAll('.nav-link, .nav-button');

    // Object to hold initialization and cleanup functions for each page module
    const pageModules = {
        'chat': {
            init: window.initChatPage,
            cleanup: window.cleanupChatPage
        },
        'about': {
            init: () => {
                // Get the span element for the version and update its text content
                const appVersionElement = document.getElementById('app-version');
                if (appVersionElement) {
                    appVersionElement.textContent = VERSION;
                } else {
                    console.warn("Element with ID 'app-version' not found on the About page.");
                }
            },
            cleanup: () => {
                // No specific cleanup needed for the About page's JS in this case
            }
        }
        // Add other page modules here if they need specific init/cleanup (e.g., 'home', 'page1', 'page2')
        // 'home': { init: window.initHomePage, cleanup: window.cleanupHomePage },
        // 'page1': { init: window.initPage1, cleanup: window.cleanupPage1 },
        // 'page2': { init: window.initPage2, cleanup: window.cleanupPage2 }
    };

    let currentPageId = null; // Stores the ID of the currently active page section (e.g., 'home-page-section')

    /**
     * Fetches HTML content for a given path and injects it into the target element.
     * @param {string} path - The path to the HTML snippet (e.g., 'home', 'chat').
     * @param {HTMLElement} targetElement - The DOM element where the content will be injected.
     * @returns {Promise<boolean>} Resolves to true on success, false on error.
     */
    async function fetchAndInjectContent(path, targetElement) {
        try {
            const response = await fetch(`content/${path}.html`);
            if (!response.ok) {
                console.error(`Could not load content for ${path}: ${response.statusText}`);
                targetElement.innerHTML = `<p>Error loading content for ${path}. Please try again.</p>`;
                return false;
            }
            const html = await response.text();
            targetElement.innerHTML = html;
            return true;
        } catch (error) {
            console.error(`Error fetching or injecting content for ${path}:`, error);
            targetElement.innerHTML = `<p>Error loading content for ${path}. Please try again.</p>`;
            return false;
        }
    }

    /**
     * Performs initial content loading for all page sections.
     */
    async function initialContentLoad() {
        const loadPromises = [];
        appPageSections.forEach(section => {
            const path = section.dataset.path;
            if (path) {
                loadPromises.push(fetchAndInjectContent(path, section));
            }
        });
        await Promise.all(loadPromises);
        console.log("All page content snippets loaded into DOM.");
    }

    /**
     * Shows a specific page section and hides all others.
     * Manages page-specific JavaScript initialization and cleanup.
     * @param {string} targetPath - The data-path of the page to show (e.g., 'home', 'chat').
     */
    function showPage(targetPath) {
        const targetSectionId = `${targetPath}-page-section`;
        const targetSection = document.getElementById(targetSectionId);

        if (!targetSection) {
            console.error(`Page section with ID "${targetSectionId}" not found in DOM.`);
            showPage('home'); // Fallback to home page
            return;
        }

        // 1. Cleanup old page's JavaScript (if any and if it's a different page)
        if (currentPageId && currentPageId !== targetSectionId) {
            const oldPagePath = currentPageId.replace('-page-section', '');
            if (pageModules[oldPagePath] && typeof pageModules[oldPagePath].cleanup === 'function') {
                console.log(`Cleaning up ${oldPagePath} page...`);
                pageModules[oldPagePath].cleanup();
            }
        }

        // 2. Hide all page sections
        appPageSections.forEach(section => {
            section.classList.remove('active-page');
            section.style.display = 'none'; // Explicitly hide
        });

        // 3. Show the target page section
        targetSection.classList.add('active-page');
        targetSection.style.display = 'block'; // Explicitly show

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
        if (pageModules[targetPath] && typeof pageModules[targetPath].init === 'function') {
            console.log(`Initializing ${targetPath} page...`);
            pageModules[targetPath].init();
        }

        // Update current page tracking
        currentPageId = targetSectionId;
        document.title = `My Site - ${targetPath.charAt(0).toUpperCase() + targetPath.slice(1)}`;
    }

    // --- Main application startup sequence ---
    await initialContentLoad(); // Wait for all content to be loaded initially

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
    });

    // Handle initial page load and back/forward button events
    const initialPath = window.location.hash.substring(1) || 'home';
    showPage(initialPath); // Show the initial page after all content is loaded

    window.addEventListener('popstate', (event) => {
        const path = event.state && event.state.path ? event.state.path : 'home';
        showPage(path);
    });
});
