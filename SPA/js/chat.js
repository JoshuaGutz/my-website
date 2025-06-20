// chat.js - Logic for the Chat SPA page

// Encapsulate all chat page logic within an object or a single init function
// to prevent global variable pollution and allow for easy initialization/cleanup.
(function() {
    // Declare variables that will be populated when initChatPage is called
    // or are needed within the scope of this module.
    let chatEmbedArea;
    let tabsContainer;
    let bottomSection; // Assuming this refers to a general bottom element outside chat content
    let pageContainer; // This might be #app-content itself or a wrapper inside it
    let newChannelPopup;
    let newChannelNameInput;
    let addChannelBtn;
    let cancelAddChannelBtn;
    let chatPageActive = false; // Flag to track if chat page is active

    // Initial channels (could eventually be loaded from storage)
    let channels = [
        { name: "deemonrider", id: "deemonrider" },
        { name: "malice_dumpling", id: "malice_dumpling" }
    ];

    let activeChannelId = null;

    // Store references to event listeners so they can be properly removed
    let newChannelInputKeydownListener;
    let addChannelBtnClickListener;
    let cancelAddChannelBtnClickListener;
    let newChannelPopupClickListener;
    let popupEscapeKeyListener;
    let visualViewportResizeListener;

    /**
     * Helper function to create and store an iframe for a channel.
     * Ensures an iframe exists for a given channelId.
     * @param {string} channelId - The ID of the Twitch channel.
     * @returns {HTMLIFrameElement} The created or existing iframe element.
     */
    function createAndStoreIframe(channelId) {
        // Only create if chatEmbedArea exists and iframe doesn't already exist
        // Note: document.getElementById checks the entire document, so even if the chat page is not
        // currently active, but its iframe was previously created, this will find it.
        // This is good for keeping iframes loaded when switching pages.
        if (document.getElementById(`iframe-${channelId}`)) {
            return document.getElementById(`iframe-${channelId}`);
        }

        const iframe = document.createElement('iframe');
        iframe.id = `iframe-${channelId}`;
        iframe.dataset.channelId = channelId;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.style.display = 'none'; // Initially hidden
        const twitchParent = window.location.hostname || 'localhost';
        iframe.src = `https://www.twitch.tv/embed/${channelId}/chat?parent=${twitchParent}&darkpopout`;

        // Crucial: Append the iframe to the *main app content area* (or a hidden part of index.html)
        // rather than chatEmbedArea if you want them to persist across page loads.
        // For now, let's append to a hidden container in index.html to keep them alive.
        // This requires an element like <div id="iframe-cache" style="display:none;"></div> in index.html
        // Or, more simply, append to document.body or a dedicated hidden container on the main index.html page
        // and only move them into chatEmbedArea when needed.
        // For now, I'll assume you want them removed from the chatEmbedArea's *view* but not destroyed from DOM.
        // Given your latest instruction, they should NOT be removed by chat.js itself.
        // They will be removed when app.js loads a new content snippet into #app-content.
        // So, this line appending to chatEmbedArea is still correct for initial placement.
        if (chatEmbedArea) { // Ensure chatEmbedArea exists before appending
            chatEmbedArea.appendChild(iframe);
        } else {
            // Fallback: If chatEmbedArea isn't ready yet (e.g., first iframe created before initChatPage runs fully)
            // append to body, but this should ideally not happen if initChatPage is called correctly.
            document.body.appendChild(iframe);
            console.warn("chatEmbedArea not found when creating iframe, appended to body. Ensure initChatPage runs correctly.");
        }

        return iframe;
    }

    /**
     * Displays a message when no chat is selected or an error occurs.
     * Hides all iframes.
     * @param {string} messageText - The message to display.
     */
    function displayNoChatSelectedMessage(messageText) {
        if (!chatEmbedArea) return; // Ensure element exists before manipulating
        const allIframes = chatEmbedArea.querySelectorAll('iframe');
        allIframes.forEach(frame => frame.style.display = 'none');

        let placeholder = chatEmbedArea.querySelector('p.no-chat-selected');
        if (!placeholder) {
            placeholder = document.createElement('p');
            placeholder.classList.add('no-chat-selected');
            placeholder.style.color = '#fff';
            placeholder.style.textAlign = 'center';
            placeholder.style.width = '100%';
            // Add some padding to prevent text from being too close to edges
            placeholder.style.padding = '20px';
            chatEmbedArea.appendChild(placeholder);
        }
        placeholder.textContent = messageText;
        placeholder.style.display = 'block';
    }

    /**
     * Renders or re-renders the channel tabs.
     */
    function renderTabs() {
        if (!tabsContainer) return; // Ensure element exists
        tabsContainer.innerHTML = ''; // Clear existing tabs

        channels.forEach(channel => {
            const tab = document.createElement('button');
            tab.classList.add('tab');
            tab.dataset.channelId = channel.id;
            const tabName = document.createElement('span');
            tabName.classList.add('tab-name');
            tabName.textContent = channel.name;
            tab.appendChild(tabName);

            const closeBtn = document.createElement('span');
            closeBtn.classList.add('close-tab-btn');
            closeBtn.innerHTML = '&times;'; // 'x' icon
            closeBtn.title = `Close ${channel.name} tab`;
            // Store reference to this listener for potential removal
            const closeListener = (event) => {
                event.stopPropagation(); // Prevent tab selection when closing
                removeChannel(channel.id);
            };
            closeBtn.addEventListener('click', closeListener);
            // Attach unique ID or store listener for removal if needed
            tab.closeListener = closeListener; // Store for easy removal if individual tabs need to be cleaned up

            tab.appendChild(closeBtn);

            if (channel.id === activeChannelId) {
                tab.classList.add('active'); // Highlight active tab
            }

            // Store reference to this listener for potential removal
            const selectListener = () => selectChannel(channel.id);
            tab.addEventListener('click', selectListener);
            tab.selectListener = selectListener; // Store for easy removal

            tabsContainer.appendChild(tab);
        });

        // Add "New +" tab button
        const newTabBtn = document.createElement('button');
        newTabBtn.classList.add('tab', 'new-tab-btn');
        newTabBtn.textContent = 'New +';
        // Store reference to this listener
        const newTabBtnListener = showNewChannelPopup;
        newTabBtn.addEventListener('click', newTabBtnListener);
        tabsContainer.appendChild(newTabBtn);
        newTabBtn.newTabListener = newTabBtnListener; // Store for easy removal
    }

    /**
     * Selects and displays a specific chat channel's iframe.
     * @param {string|null} channelId - The ID of the channel to select, or null to show placeholder.
     */
    function selectChannel(channelId) {
        if (!chatEmbedArea) return; // Ensure element exists

        const placeholder = chatEmbedArea.querySelector('p.no-chat-selected');
        if (placeholder) {
            placeholder.style.display = 'none'; // Hide placeholder
        }

        const allIframes = chatEmbedArea.querySelectorAll('iframe');
        allIframes.forEach(frame => {
            frame.style.display = 'none'; // Hide all iframes first
        });

        const selectedChannelObject = channels.find(ch => ch.id === channelId);
        if (selectedChannelObject) {
            activeChannelId = selectedChannelObject.id;
            let targetIframe = document.getElementById(`iframe-${selectedChannelObject.id}`);
            if (!targetIframe) {
                // If iframe does not exist in the DOM (e.g., was removed by app.js when navigating away)
                // we should re-create it.
                targetIframe = createAndStoreIframe(selectedChannelObject.id);
            } else {
                // If the iframe already exists but is currently outside chatEmbedArea (e.g., in body)
                // move it back into chatEmbedArea.
                if (targetIframe.parentElement !== chatEmbedArea) {
                    chatEmbedArea.appendChild(targetIframe);
                }
            }

            if (targetIframe) {
                targetIframe.style.display = 'block'; // Show selected iframe
            } else {
                displayNoChatSelectedMessage(`Error: Could not load chat for ${selectedChannelObject.name}.`);
            }
        } else {
            activeChannelId = null;
            // Display appropriate message if no channels or no channel selected
            displayNoChatSelectedMessage(channels.length === 0 ? "No channels. Add a new channel to begin." : "Select a channel to view chat.");
        }
        renderTabs(); // Re-render tabs to update active state
    }

    /**
     * Removes a channel and its associated iframe and tab.
     * Note: This function only removes the iframe from the DOM if the channel is closed.
     * If the SPA navigates to a new page, app.js will automatically remove this content.
     * @param {string} channelIdToRemove - The ID of the channel to remove.
     */
    function removeChannel(channelIdToRemove) {
        const indexToRemove = channels.findIndex(ch => ch.id === channelIdToRemove);
        if (indexToRemove === -1) return; // Channel not found

        // Removed the line: if (iframeToRemove) { iframeToRemove.remove(); }
        // The iframe will be removed when the entire chat content section is replaced by app.js
        // or if explicitly handled by the SPA's dynamic page management (e.g., iframes moved to a cache).

        const wasActive = (activeChannelId === channelIdToRemove); // Check if the removed channel was active
        channels.splice(indexToRemove, 1); // Remove channel from array

        if (wasActive) {
            // If the removed channel was active, select the first available channel, or null
            activeChannelId = channels.length > 0 ? channels[0].id : null;
        }
        selectChannel(activeChannelId); // Update selection and re-render tabs
    }

    /**
     * Handles adding a new Twitch channel based on user input.
     */
    function handleAddNewChannel() {
        if (!newChannelNameInput) return; // Ensure element exists
        const newName = newChannelNameInput.value.trim();
        if (newName) {
            const newChannelId = newName.toLowerCase().replace(/[^a-z0-9_]/g, ''); // Sanitize input
            if (!newChannelId) {
                console.warn("Invalid channel name after sanitization.");
                return;
            }
            if (channels.some(ch => ch.id === newChannelId || ch.name.toLowerCase() === newName.toLowerCase())) {
                console.warn("Channel name or ID already exists.");
                return;
            }

            channels.push({ name: newName, id: newChannelId }); // Add new channel
            createAndStoreIframe(newChannelId); // Create iframe for it
            hideNewChannelPopup(); // Hide popup
            selectChannel(newChannelId); // Select the new channel
        } else {
            console.warn("Please enter a channel name.");
        }
    }

    /**
     * Handles keyboard events for the new channel popup.
     * @param {KeyboardEvent} event
     */
    function handlePopupEscapeKey(event) {
        if (newChannelPopup && newChannelPopup.style.display === 'flex' && event.key === 'Escape') {
            hideNewChannelPopup();
        }
    }

    /**
     * Shows the new channel popup.
     */
    function showNewChannelPopup() {
        if (!newChannelNameInput || !newChannelPopup) return; // Ensure elements exist
        newChannelNameInput.value = ''; // Clear input
        newChannelPopup.style.display = 'flex'; // Show popup
        newChannelNameInput.focus(); // Focus input field
        // Add event listener for escape key
        popupEscapeKeyListener = handlePopupEscapeKey; // Store reference
        document.addEventListener('keydown', popupEscapeKeyListener);
    }

    /**
     * Hides the new channel popup.
     */
    function hideNewChannelPopup() {
        if (!newChannelPopup) return; // Ensure element exists
        newChannelPopup.style.display = 'none'; // Hide popup
        // Remove event listener for escape key to prevent memory leaks
        if (popupEscapeKeyListener) {
            document.removeEventListener('keydown', popupEscapeKeyListener);
            popupEscapeKeyListener = null; // Clear reference
        }
    }

    // --- Keyboard Visibility & Resizing Logic (Mobile Keyboard Detection) ---
    // This logic needs to consider if the SPA's main content area is dynamically sized.
    // It's currently operating on pageContainer, bottomSection, and tabsContainer.
    // Ensure these elements are part of the chat.html content or correctly selected from main index.html
    let initialWindowHeight = window.innerHeight; // Store initial height on page load
    let currentVisualViewportHeight = window.innerHeight; // To track changes

    function handleVisualViewportResize() {
        if (!pageContainer) {
            console.warn("Page container not found for keyboard resize logic.");
            return;
        }

        const newHeight = window.visualViewport.height;
        currentVisualViewportHeight = newHeight; // Update current height

        // Define a threshold for keyboard detection (e.g., if height shrinks by more than 10%)
        const keyboardThreshold = initialWindowHeight * 0.9;

        if (newHeight < keyboardThreshold) {
            // Keyboard is open or virtual keyboard causing shrink
            pageContainer.style.height = `${newHeight}px`; // Shrink page container
            if (tabsContainer) tabsContainer.style.display = 'none'; // Hide tabs
            if (bottomSection) bottomSection.style.display = 'none'; // Hide bottom nav (if it's the one targeted)
        } else {
            // Keyboard is closed, revert to original layout.
            // Use 100% of the visual viewport height or adapt based on fixed elements
            pageContainer.style.height = '100dvh'; // Use dynamic viewport height for full height
            if (tabsContainer) tabsContainer.style.display = 'flex'; // Show tabs
            if (bottomSection) bottomSection.style.display = 'flex'; // Show bottom nav (assuming flex)
        }
    }

    /**
     * Initializes the chat page logic when its HTML content is loaded.
     * This function should be called by app.js.
     */
    window.initChatPage = function() {
        if (chatPageActive) {
            console.warn("Chat page already initialized.");
            return;
        }
        chatPageActive = true;
        console.log("Initializing Chat Page...");

        // Get DOM references *after* the HTML for chat.html has been injected
        chatEmbedArea = document.getElementById('chat-embed-area');
        tabsContainer = document.getElementById('tabs-container');
        // IMPORTANT: bottomSection and pageContainer might refer to elements in index.html,
        // or a wrapper within chat.html. Adjust selectors if necessary.
        // Assuming pageContainer is the section containing main chat content, e.g., the .page-container div in chat.html
        pageContainer = document.querySelector('.chat-page-content .page-container'); // Corrected selector to find within chat content
        bottomSection = document.querySelector('.bottom-nav'); // This is the main bottom nav from index.html

        newChannelPopup = document.getElementById('new-channel-popup');
        newChannelNameInput = document.getElementById('new-channel-name');
        addChannelBtn = document.getElementById('add-channel-btn');
        cancelAddChannelBtn = document.getElementById('cancel-add-channel-btn');

        if (!chatEmbedArea || !tabsContainer || !newChannelPopup || !newChannelNameInput || !addChannelBtn || !cancelAddChannelBtn) {
            console.error("One or more required chat page DOM elements not found after initialization.");
            return; // Exit if critical elements are missing
        }

        // Attach event listeners
        newChannelInputKeydownListener = (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleAddNewChannel();
            }
        };
        newChannelNameInput.addEventListener('keydown', newChannelInputKeydownListener);

        addChannelBtnClickListener = handleAddNewChannel;
        addChannelBtn.addEventListener('click', addChannelBtnClickListener);

        cancelAddChannelBtnClickListener = hideNewChannelPopup;
        cancelAddChannelBtn.addEventListener('click', cancelAddChannelBtnClickListener);

        newChannelPopupClickListener = (event) => {
            if (event.target === newChannelPopup) hideNewChannelPopup();
        };
        newChannelPopup.addEventListener('click', newChannelPopupClickListener);

        // Initialize channels and select first one
        // If iframes already exist (from a previous visit to the chat page), don't recreate, just select
        channels.forEach(channel => {
            if (!document.getElementById(`iframe-${channel.id}`)) { // Only create if not already in global DOM
                createAndStoreIframe(channel.id);
            }
        });
        selectChannel(channels.length > 0 ? channels[0].id : null);

        // Set up keyboard visibility resize listener
        if (window.visualViewport) {
            initialWindowHeight = window.visualViewport.height; // Capture initial height correctly
            visualViewportResizeListener = handleVisualViewportResize;
            window.visualViewport.addEventListener('resize', visualViewportResizeListener);
        }
    };

    /**
     * Cleans up the chat page logic when navigating away.
     * This function should be called by app.js.
     */
    window.cleanupChatPage = function() {
        if (!chatPageActive) return; // Only cleanup if active
        chatPageActive = false;
        console.log("Cleaning up Chat Page...");

        // NO LONGER REMOVING DYNAMICALLY CREATED IFRAMES HERE
        // The iframes are meant to persist so their state is maintained.
        // They will be removed from the DOM when app.js loads new content into #app-content.
        // Iframes themselves maintain state across DOM removal/re-addition (browser dependent to some extent).

        // Remove event listeners to prevent memory leaks
        if (newChannelNameInput && newChannelInputKeydownListener) {
            newChannelNameInput.removeEventListener('keydown', newChannelInputKeydownListener);
        }
        if (addChannelBtn && addChannelBtnClickListener) {
            addChannelBtn.removeEventListener('click', addChannelBtnClickListener);
        }
        if (cancelAddChannelBtn && cancelAddChannelBtnClickListener) {
            cancelAddChannelBtn.removeEventListener('click', cancelAddChannelBtnClickListener);
        }
        if (newChannelPopup && newChannelPopupClickListener) {
            newChannelPopup.removeEventListener('click', newChannelPopupClickListener);
        }
        if (popupEscapeKeyListener) {
            document.removeEventListener('keydown', popupEscapeKeyListener);
        }
        if (visualViewportResizeListener) {
            window.visualViewport.removeEventListener('resize', visualViewportResizeListener);
        }

        // Clean up individual tab listeners
        // This is important because these are on buttons that might be recreated
        if (tabsContainer) {
            tabsContainer.querySelectorAll('.tab').forEach(tab => {
                if (tab.closeListener) tab.removeEventListener('click', tab.closeListener);
                if (tab.selectListener) tab.removeEventListener('click', tab.selectListener);
                if (tab.newTabListener) tab.removeEventListener('click', tab.newTabListener);
            });
        }

        // Reset DOM element references to null to prevent stale closures.
        // These elements will be re-selected by initChatPage when the page is revisited.
        chatEmbedArea = null;
        tabsContainer = null;
        bottomSection = null;
        pageContainer = null;
        newChannelPopup = null;
        newChannelNameInput = null;
        addChannelBtn = null;
        cancelAddChannelBtn = null;
    };
})();
