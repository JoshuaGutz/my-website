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
    let iframeCache; // Reference to the hidden iframe cache container
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
     * If not found, creates it and appends to iframeCache.
     * @param {string} channelId - The ID of the Twitch channel.
     * @returns {HTMLIFrameElement} The created or existing iframe element.
     */
    function createAndStoreIframe(channelId) {
        let iframe = document.getElementById(`iframe-${channelId}`);
        if (iframe) {
            // If iframe already exists anywhere in the DOM, return it
            return iframe;
        }

        // If iframe doesn't exist, create it
        iframe = document.createElement('iframe');
        iframe.id = `iframe-${channelId}`;
        iframe.dataset.channelId = channelId;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.style.display = 'none'; // Initially hidden
        const twitchParent = window.location.hostname || 'localhost';
        iframe.src = `https://www.twitch.tv/embed/${channelId}/chat?parent=${twitchParent}&darkpopout`;

        // Append new iframe to the hidden cache
        if (iframeCache) {
            iframeCache.appendChild(iframe);
        } else {
            // Fallback if iframeCache is not yet available, append to body
            document.body.appendChild(iframe);
            console.warn("iframeCache not found when creating iframe, appended to body. Ensure initChatPage runs correctly.");
        }
        return iframe;
    }

    /**
     * Displays a message when no chat is selected or an error occurs.
     * Hides all iframes currently in chatEmbedArea.
     * @param {string} messageText - The message to display.
     */
    function displayNoChatSelectedMessage(messageText) {
        if (!chatEmbedArea) return; // Ensure element exists before manipulating

        // Hide all iframes that might be visible in chatEmbedArea
        const iframesInChatArea = chatEmbedArea.querySelectorAll('iframe');
        iframesInChatArea.forEach(frame => frame.style.display = 'none');

        let placeholder = chatEmbedArea.querySelector('p.no-chat-selected');
        if (!placeholder) {
            placeholder = document.createElement('p');
            placeholder.classList.add('no-chat-selected');
            placeholder.style.color = '#fff';
            placeholder.style.textAlign = 'center';
            placeholder.style.width = '100%';
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
            const closeListener = (event) => {
                event.stopPropagation();
                removeChannel(channel.id);
            };
            closeBtn.addEventListener('click', closeListener);
            tab.closeListener = closeListener; // Store for easy removal

            tab.appendChild(closeBtn);

            if (channel.id === activeChannelId) {
                tab.classList.add('active'); // Highlight active tab
            }

            const selectListener = () => selectChannel(channel.id);
            tab.addEventListener('click', selectListener);
            tab.selectListener = selectListener; // Store for easy removal

            tabsContainer.appendChild(tab);
        });

        // Add "New +" tab button
        const newTabBtn = document.createElement('button');
        newTabBtn.classList.add('tab', 'new-tab-btn');
        newTabBtn.textContent = 'New +';
        const newTabBtnListener = showNewChannelPopup;
        newTabBtn.addEventListener('click', newTabBtnListener);
        tabsContainer.appendChild(newTabBtn);
        newTabBtn.newTabListener = newTabBtnListener; // Store for easy removal
    }

    /**
     * Selects and displays a specific chat channel's iframe.
     * Moves iframes between chatEmbedArea and iframeCache.
     * @param {string|null} channelId - The ID of the channel to select, or null to show placeholder.
     */
    function selectChannel(channelId) {
        if (!chatEmbedArea || !iframeCache) return; // Ensure elements exist

        const placeholder = chatEmbedArea.querySelector('p.no-chat-selected');
        if (placeholder) {
            placeholder.style.display = 'none'; // Hide placeholder
        }

        // Move all currently visible iframes from chatEmbedArea back to iframeCache
        // and hide them.
        const visibleIframes = chatEmbedArea.querySelectorAll('iframe');
        visibleIframes.forEach(frame => {
            frame.style.display = 'none';
            iframeCache.appendChild(frame); // Move to cache
        });

        const selectedChannelObject = channels.find(ch => ch.id === channelId);
        if (selectedChannelObject) {
            activeChannelId = selectedChannelObject.id;
            let targetIframe = createAndStoreIframe(selectedChannelObject.id); // Get or create from cache

            if (targetIframe) {
                chatEmbedArea.appendChild(targetIframe); // Move to active view
                targetIframe.style.display = 'block'; // Show selected iframe
            } else {
                displayNoChatSelectedMessage(`Error: Could not load chat for ${selectedChannelObject.name}.`);
            }
        } else {
            activeChannelId = null;
            displayNoChatSelectedMessage(channels.length === 0 ? "No channels. Add a new channel to begin." : "Select a channel to view chat.");
        }
        renderTabs(); // Re-render tabs to update active state
    }

    /**
     * Removes a channel and its associated iframe and tab.
     * The iframe is also removed from the DOM here.
     * @param {string} channelIdToRemove - The ID of the channel to remove.
     */
    function removeChannel(channelIdToRemove) {
        const indexToRemove = channels.findIndex(ch => ch.id === channelIdToRemove);
        if (indexToRemove === -1) return; // Channel not found

        const iframeToRemove = document.getElementById(`iframe-${channelIdToRemove}`);
        if (iframeToRemove) {
            iframeToRemove.remove(); // Remove iframe completely from DOM
        }

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
            createAndStoreIframe(newChannelId); // Create iframe for it (appends to cache)
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
        popupEscapeKeyListener = handlePopupEscapeKey; // Store reference
        document.addEventListener('keydown', popupEscapeKeyListener);
    }

    /**
     * Hides the new channel popup.
     */
    function hideNewChannelPopup() {
        if (!newChannelPopup) return; // Ensure element exists
        newChannelPopup.style.display = 'none'; // Hide popup
        if (popupEscapeKeyListener) {
            document.removeEventListener('keydown', popupEscapeKeyListener);
            popupEscapeKeyListener = null; // Clear reference
        }
    }

    // --- Keyboard Visibility & Resizing Logic (Mobile Keyboard Detection) ---
    let initialWindowHeight = window.innerHeight;
    let currentVisualViewportHeight = window.innerHeight;

    function handleVisualViewportResize() {
        if (!pageContainer) {
            console.warn("Page container not found for keyboard resize logic.");
            return;
        }

        const newHeight = window.visualViewport.height;
        currentVisualViewportHeight = newHeight;

        const keyboardThreshold = initialWindowHeight * 0.9;

        if (newHeight < keyboardThreshold) {
            pageContainer.style.height = `${newHeight}px`;
            if (tabsContainer) tabsContainer.style.display = 'none';
            if (bottomSection) bottomSection.style.display = 'none';
        } else {
            pageContainer.style.height = '100dvh';
            if (tabsContainer) tabsContainer.style.display = 'flex';
            if (bottomSection) bottomSection.style.display = 'flex';
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
        pageContainer = document.querySelector('.chat-page-content .page-container');
        bottomSection = document.querySelector('.bottom-nav'); // This is the main bottom nav from index.html
        newChannelPopup = document.getElementById('new-channel-popup');
        newChannelNameInput = document.getElementById('new-channel-name');
        addChannelBtn = document.getElementById('add-channel-btn');
        cancelAddChannelBtn = document.getElementById('cancel-add-channel-btn');
        iframeCache = document.getElementById('iframe-cache'); // Get reference to the cache

        if (!chatEmbedArea || !tabsContainer || !newChannelPopup || !newChannelNameInput || !addChannelBtn || !cancelAddChannelBtn || !iframeCache) {
            console.error("One or more required chat page DOM elements not found after initialization.");
            return;
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

        // Ensure all initial channels have their iframes created and moved to cache
        channels.forEach(channel => {
            createAndStoreIframe(channel.id); // This now appends to iframeCache
        });
        selectChannel(activeChannelId || (channels.length > 0 ? channels[0].id : null));

        if (window.visualViewport) {
            initialWindowHeight = window.visualViewport.height;
            visualViewportResizeListener = handleVisualViewportResize;
            window.visualViewport.addEventListener('resize', visualViewportResizeListener);
        }
    };

    /**
     * Cleans up the chat page logic when navigating away.
     * Moves visible iframes back to cache and removes event listeners.
     * This function should be called by app.js.
     */
    window.cleanupChatPage = function() {
        if (!chatPageActive) return;
        chatPageActive = false;
        console.log("Cleaning up Chat Page...");

        // Move all currently visible iframes from chatEmbedArea back to iframeCache
        // and hide them.
        if (chatEmbedArea && iframeCache) {
            const iframesInChatArea = chatEmbedArea.querySelectorAll('iframe');
            iframesInChatArea.forEach(frame => {
                frame.style.display = 'none';
                iframeCache.appendChild(frame); // Move to cache
            });
        }

        // Remove event listeners
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
        if (tabsContainer) {
            tabsContainer.querySelectorAll('.tab').forEach(tab => {
                if (tab.closeListener) tab.removeEventListener('click', tab.closeListener);
                if (tab.selectListener) tab.removeEventListener('click', tab.selectListener);
                if (tab.newTabListener) tab.removeEventListener('click', tab.newTabListener);
            });
        }

        // Reset DOM element references to null
        chatEmbedArea = null;
        tabsContainer = null;
        bottomSection = null;
        pageContainer = null;
        newChannelPopup = null;
        newChannelNameInput = null;
        addChannelBtn = null;
        cancelAddChannelBtn = null;
        iframeCache = null; // Also clear cache reference
    };
})();
