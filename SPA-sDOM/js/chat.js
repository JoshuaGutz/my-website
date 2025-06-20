// chat.js - Logic for the Chat SPA page

// Encapsulate all chat page logic within an object or a single init function
// to prevent global variable pollution and allow for easy initialization/cleanup.
(function() {
    // Declare variables that will be populated when initChatPage is called
    let chatEmbedArea;
    let tabsContainer;
    let pageContainer; // Refers to the .chat-page-content .page-container from chat.html
    let newChannelPopup;
    let newChannelNameInput;
    let addChannelBtn;
    let cancelAddChannelBtn;
    let bottomSection; // Reference to the main bottom nav from index.html

    let chatPageInitialized = false; // Flag to ensure init runs only once globally for the chat module
    let chatPageCurrentlyActive = false; // Flag to track if chat page is currently shown

    // Debug mode switch: Set to `true` to use solid color iframes for testing.
    // Set to `false` to use actual Twitch embeds.
    const debugMode = true; // <--- Set this to false for actual Twitch embeds

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
    let visualViewportResizeListener; // This one is tied to window.visualViewport

    /**
     * Helper function to create a random hex color for debug mode.
     */
    function getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    /**
     * Helper function to create an iframe for a channel.
     * In this single-DOM architecture, iframes are created once and stay in chatEmbedArea.
     * @param {string} channelId - The ID of the Twitch channel.
     * @returns {HTMLIFrameElement} The created or existing iframe element.
     */
    function createIframe(channelId) {
        let iframe = document.getElementById(`iframe-${channelId}`);
        if (iframe) {
            // If iframe already exists in the DOM, return it
            return iframe;
        }

        // If iframe doesn't exist, create it and append to chatEmbedArea
        iframe = document.createElement('iframe');
        iframe.id = `iframe-${channelId}`;
        iframe.dataset.channelId = channelId;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.style.display = 'none'; // Initially hidden
        iframe.style.position = 'absolute'; // Position within chat-embed-area
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.zIndex = '1'; // Default z-index

        if (debugMode) {
            const color = getRandomColor();
            iframe.src = `data:text/html;charset=utf-8,<body style="background-color: ${color}; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; font-family: sans-serif; color: white; font-size: 2em;">${channelId.toUpperCase()}</body>`;
        } else {
            const twitchParent = window.location.hostname || 'localhost';
            iframe.src = `https://www.twitch.tv/embed/${channelId}/chat?parent=${twitchParent}&darkpopout`;
        }

        if (chatEmbedArea) {
            chatEmbedArea.appendChild(iframe);
        } else {
            console.error("chatEmbedArea not found when creating iframe. Cannot append.");
            // Fallback, though ideally chatEmbedArea is present before this runs
            document.body.appendChild(iframe);
        }
        return iframe;
    }

    /**
     * Displays a message when no chat is selected or an error occurs.
     * Hides all iframes.
     * @param {string} messageText - The message to display.
     */
    function displayNoChatSelectedMessage(messageText) {
        if (!chatEmbedArea) return;

        const allIframes = chatEmbedArea.querySelectorAll('iframe');
        allIframes.forEach(frame => frame.style.display = 'none');

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
        if (!tabsContainer) return;
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
     * Toggles visibility of iframes.
     * @param {string|null} channelId - The ID of the channel to select, or null to show placeholder.
     */
    function selectChannel(channelId) {
        if (!chatEmbedArea) return;

        const placeholder = chatEmbedArea.querySelector('p.no-chat-selected');
        if (placeholder) {
            placeholder.style.display = 'none';
        }

        // Hide all iframes currently in chatEmbedArea
        const iframesInChatArea = chatEmbedArea.querySelectorAll('iframe');
        iframesInChatArea.forEach(frame => {
            frame.style.display = 'none';
        });

        const selectedChannelObject = channels.find(ch => ch.id === channelId);
        if (selectedChannelObject) {
            activeChannelId = selectedChannelObject.id;
            const targetIframe = document.getElementById(`iframe-${selectedChannelObject.id}`); // Get existing iframe

            if (targetIframe) {
                targetIframe.style.display = 'block'; // Show selected iframe
            } else {
                displayNoChatSelectedMessage(`Error: Iframe for ${selectedChannelObject.name} not found.`);
                console.error(`Iframe for channel ID: ${selectedChannelObject.id} was not found in DOM.`);
            }
        } else {
            activeChannelId = null;
            displayNoChatSelectedMessage(channels.length === 0 ? "No channels. Add a new channel to begin." : "Select a channel to view chat.");
        }
        renderTabs(); // Re-render tabs to update active state
    }

    /**
     * Removes a channel and its associated iframe and tab.
     * The iframe is removed from the DOM completely here.
     * @param {string} channelIdToRemove - The ID of the channel to remove.
     */
    function removeChannel(channelIdToRemove) {
        const indexToRemove = channels.findIndex(ch => ch.id === channelIdToRemove);
        if (indexToRemove === -1) return;

        const iframeToRemove = document.getElementById(`iframe-${channelIdToRemove}`);
        if (iframeToRemove) {
            iframeToRemove.remove(); // Remove iframe completely from DOM
        }

        const wasActive = (activeChannelId === channelIdToRemove);
        channels.splice(indexToRemove, 1);

        if (wasActive) {
            activeChannelId = channels.length > 0 ? channels[0].id : null;
        }
        selectChannel(activeChannelId); // Update selection and re-render tabs
    }

    /**
     * Handles adding a new Twitch channel based on user input.
     */
    function handleAddNewChannel() {
        if (!newChannelNameInput) return;
        const newName = newChannelNameInput.value.trim();
        if (newName) {
            const newChannelId = newName.toLowerCase().replace(/[^a-z0-9_]/g, '');
            if (!newChannelId) {
                console.warn("Invalid channel name after sanitization.");
                return;
            }
            if (channels.some(ch => ch.id === newChannelId || ch.name.toLowerCase() === newName.toLowerCase())) {
                console.warn("Channel name or ID already exists.");
                return;
            }

            channels.push({ name: newName, id: newChannelId });
            createIframe(newChannelId); // Create iframe for it
            hideNewChannelPopup();
            selectChannel(newChannelId);
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
        if (!newChannelNameInput || !newChannelPopup) return;
        newChannelNameInput.value = '';
        newChannelPopup.style.display = 'flex';
        newChannelNameInput.focus();
        popupEscapeKeyListener = handlePopupEscapeKey;
        document.addEventListener('keydown', popupEscapeKeyListener);
    }

    /**
     * Hides the new channel popup.
     */
    function hideNewChannelPopup() {
        if (!newChannelPopup) return;
        newChannelPopup.style.display = 'none';
        if (popupEscapeKeyListener) {
            document.removeEventListener('keydown', popupEscapeKeyListener);
            popupEscapeKeyListener = null;
        }
    }

    // --- Keyboard Visibility & Resizing Logic (Mobile Keyboard Detection) ---
    // This logic relies on `pageContainer` being present in the DOM.
    // It will only run if chatPageCurrentlyActive is true.
    let initialWindowHeight = window.innerHeight; // This is captured once on global script load
    let currentVisualViewportHeight = window.innerHeight;

    function handleVisualViewportResize() {
        if (!chatPageCurrentlyActive || !pageContainer) { // Only run if chat page is active and elements exist
            return;
        }

        const newHeight = window.visualViewport.height;
        currentVisualViewportHeight = newHeight;

        const keyboardThreshold = initialWindowHeight * 0.9;

        if (newHeight < keyboardThreshold) {
            pageContainer.style.height = `${newHeight}px`;
            if (tabsContainer) tabsContainer.style.display = 'none';
            if (bottomSection) bottomSection.style.display = 'none';
            // Also adjust iframe heights if keyboard is open
            if (activeChannelId) {
                const activeIframe = document.getElementById(`iframe-${activeChannelId}`);
                if (activeIframe) {
                    // Recalculate based on new pageContainer height
                    const rect = chatEmbedArea.getBoundingClientRect();
                    activeIframe.style.height = `${rect.height}px`;
                }
            }
        } else {
            // Reset pageContainer height. Using '100%' here because its parent .app-page-section
            // now has 100% height relative to #app-content-wrapper.
            pageContainer.style.height = '100%';
            if (tabsContainer) tabsContainer.style.display = 'flex';
            if (bottomSection) bottomSection.style.display = 'flex';
            // Reset iframe heights
            if (activeChannelId) {
                const activeIframe = document.getElementById(`iframe-${activeChannelId}`);
                if (activeIframe) {
                    const rect = chatEmbedArea.getBoundingClientRect();
                    activeIframe.style.height = `${rect.height}px`;
                }
            }
        }
    }

    // --- Global Init and Cleanup for SPA Integration ---

    /**
     * Initializes the chat page logic when its HTML content is made visible.
     * This function should be called by app.js.
     */
    window.initChatPage = function() {
        if (chatPageCurrentlyActive) {
            console.warn("Chat page already visually active.");
            return;
        }
        chatPageCurrentlyActive = true;
        console.log("Activating Chat Page...");

        // Ensure DOM elements are referenced only once upon first initialization
        // if this module needs to manage them across its entire lifecycle
        if (!chatPageInitialized) {
            chatPageInitialized = true;
            console.log("Chat Page Module: First-time initialization.");

            // Get DOM references (they now always exist since content is in index.html)
            chatEmbedArea = document.getElementById('chat-embed-area');
            tabsContainer = document.getElementById('tabs-container');
            pageContainer = document.querySelector('#chat-page-section .page-container'); // Selector within its section
            bottomSection = document.querySelector('.bottom-nav'); // This is the main bottom nav from index.html
            newChannelPopup = document.getElementById('new-channel-popup');
            newChannelNameInput = document.getElementById('new-channel-name');
            addChannelBtn = document.getElementById('add-channel-btn');
            cancelAddChannelBtn = document.getElementById('cancel-add-channel-btn');

            if (!chatEmbedArea || !tabsContainer || !pageContainer || !newChannelPopup || !newChannelNameInput || !addChannelBtn || !cancelAddChannelBtn) {
                console.error("One or more required chat page DOM elements not found during initial setup.");
                return;
            }

            // Attach core event listeners ONCE
            newChannelNameInput.addEventListener('keydown', (newChannelInputKeydownListener = (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    handleAddNewChannel();
                }
            }));

            addChannelBtn.addEventListener('click', (addChannelBtnClickListener = handleAddNewChannel));
            cancelAddChannelBtn.addEventListener('click', (cancelAddChannelBtnClickListener = hideNewChannelPopup));
            newChannelPopup.addEventListener('click', (newChannelPopupClickListener = (event) => {
                if (event.target === newChannelPopup) hideNewChannelPopup();
            }));

            // Create iframes for initial channels
            channels.forEach(channel => {
                createIframe(channel.id);
            });

            // Set up keyboard visibility resize listener ONCE
            if (window.visualViewport) {
                initialWindowHeight = window.visualViewport.height;
                visualViewportResizeListener = handleVisualViewportResize;
                window.visualViewport.addEventListener('resize', visualViewportResizeListener);
            }
        }

        // Actions to perform every time the chat page becomes active/visible
        selectChannel(activeChannelId || (channels.length > 0 ? channels[0].id : null));
        // Re-adjust pageContainer height on activation to handle initial orientation/keyboard state
        handleVisualViewportResize();
    };

    /**
     * Cleans up the chat page logic when navigating away.
     * Hides all iframes. This function should be called by app.js.
     */
    window.cleanupChatPage = function() {
        if (!chatPageCurrentlyActive) return;
        chatPageCurrentlyActive = false;
        console.log("Deactivating Chat Page...");

        // Hide all iframes
        if (chatEmbedArea) {
            const allIframes = chatEmbedArea.querySelectorAll('iframe');
            allIframes.forEach(frame => {
                frame.style.display = 'none';
            });
        }
        // Restore elements potentially hidden by keyboard logic
        if (tabsContainer) tabsContainer.style.display = 'flex';
        if (bottomSection) bottomSection.style.display = 'flex';
        if (pageContainer) pageContainer.style.height = '100%'; // Reset chat page wrapper height
        hideNewChannelPopup(); // Ensure popup is hidden when leaving page

        // Event listeners attached to elements within the chat page (like popup buttons, new channel input)
        // are now persistent because their DOM elements are persistent.
        // So, explicit removal here is less about memory leaks across page *loads* and more about
        // ensuring logic is not active when page is hidden.
        // For simplicity and since we only init once, we can leave these listeners as persistent.
        // If there were listeners on elements that are frequently removed/re-added within the chat page itself,
        // then they would need more fine-grained management.
    };
})();
