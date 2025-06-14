document.addEventListener('DOMContentLoaded', () => {
    // Select the main content area and all navigation links and buttons
    const appContent = document.getElementById('app-content');
    const navItems = document.querySelectorAll('.nav-link, .nav-button'); // Select both links and buttons

    /**
     * Loads content dynamically into the app-content area.
     * Fetches HTML snippets based on the provided path.
     * @param {string} path - The path corresponding to the content snippet (e.g., 'home', 'about').
     */
    async function loadContent(path) {
        // Always update highlighting first, regardless of content loading success
        // Remove 'active' class from all true navigation links
        navItems.forEach(item => {
            // Only remove 'active' from actual navigation links (<a> tags with .nav-link class)
            if (item.classList.contains('nav-link')) {
                item.classList.remove('active');
            }
        });

        // Add 'active' class to the currently selected navigation link
        const currentNavLink = document.querySelector(`.nav-link[data-path="${path}"]`);
        if (currentNavLink) {
            currentNavLink.classList.add('active');
        }

        try {
            // Construct the path to your content snippet
            const response = await fetch(`content/${path}.html`);

            // Check if the network response was successful (status code 200-299)
            if (!response.ok) {
                // If not successful, throw an error
                throw new Error(`Could not load content for ${path}: ${response.statusText}`);
            }

            // Get the response body as plain text (HTML string)
            const html = await response.text();
            // Inject the fetched HTML content into the main content area
            appContent.innerHTML = html;

            // Add a class to the appContent for page-specific styling
            appContent.className = `page-${path}`;

            // Update the document title to reflect the current page
            document.title = `My Site - ${path.charAt(0).toUpperCase() + path.slice(1)}`;

            // Scroll to the top of the content area after loading new content
            appContent.scrollTop = 0;

        } catch (error) {
            // Catch and log any errors during the fetch or DOM manipulation
            console.error('Error loading content:', error);
            // Display an error message to the user
            appContent.innerHTML = '<p>Error loading content. Please try again.</p>';
            document.title = 'My Site - Error';
        }
    }

    // Handle navigation clicks for elements with data-path (actual navigation links)
    // The 'toggle-top-bar' action will now be handled directly in toggleTopBar.js
    navItems.forEach(item => {
        if (item.dataset.path) { // Only attach click listener for navigation links
            item.addEventListener('click', (event) => {
                event.preventDefault(); // Prevent default link behavior (full reload)
                const path = event.currentTarget.dataset.path;
                history.pushState({ path: path }, '', `#${path}`);
                loadContent(path);
            });
        }
    });


    // Handle initial page load and browser's back/forward button events

    // Determine the initial path from the URL hash (e.g., #home, #about)
    const initialPath = window.location.hash.substring(1) || 'home';
    // Load the content for the initial path
    loadContent(initialPath); // This will also highlight the initial active link

    // Listen for the 'popstate' event, which fires when the browser's back/forward buttons are used
    window.addEventListener('popstate', (event) => {
        // Get the path from the history state (if available) or default to 'home'
        const path = event.state && event.state.path ? event.state.path : 'home';
        // Load the content for the path retrieved from the history
        loadContent(path);
    });
});
