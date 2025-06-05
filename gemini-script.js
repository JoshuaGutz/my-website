document.addEventListener('DOMContentLoaded', () => {
    const chatEmbedArea = document.getElementById('chat-embed-area');
    const tabsContainer = document.getElementById('tabs-container');
    const newChannelPopup = document.getElementById('new-channel-popup');
    const newChannelNameInput = document.getElementById('new-channel-name');
    const addChannelBtn = document.getElementById('add-channel-btn');
    const cancelAddChannelBtn = document.getElementById('cancel-add-channel-btn');

    // Initial channels
    let channels = [
        { name: "deemonrider", id: "deemonrider" },
        { name: "malice_dumpling", id: "malice_dumpling" }
    ];

    let activeChannelId = null;

    /*
    // --- USER'S JAVASCRIPT FOR COUNTDOWN AND SPRITE ---
    // Example:
    // function updateCountdownDisplay(timeString) {
    //     const countdownEl = document.getElementById('countdown');
    //     if (countdownEl) {
    //         countdownEl.textContent = timeString;
    //     }
    // }
    // function updateSpriteImageSource(imageUrl) {
    //     const spriteImgEl = document.getElementById('sprite-image');
    //     if (spriteImgEl) {
    //         spriteImgEl.src = imageUrl;
    //     }
    // }
    // --- END USER'S JAVASCRIPT ---
    */

    // Helper function to create and store an iframe for a channel
    function createAndStoreIframe(channelId) {
        // Check if iframe already exists to prevent duplicates
        if (document.getElementById(`iframe-${channelId}`)) {
            return document.getElementById(`iframe-${channelId}`);
        }

        const iframe = document.createElement('iframe');
        iframe.id = `iframe-${channelId}`; // Unique ID for each iframe
        iframe.dataset.channelId = channelId; // Store channelId for reference
        iframe.style.width = '100%';
        // iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.style.display = 'none'; // Initially hidden
        const twitchParent = window.location.hostname || 'localhost'; // Dynamically get parent domain
        iframe.src = `https://www.twitch.tv/embed/${channelId}/chat?parent=${twitchParent}&darkpopout`;

        chatEmbedArea.appendChild(iframe);
        return iframe;
    }

    // Helper function to display messages like "No chat selected"
    function displayNoChatSelectedMessage(messageText) {
        // Hide all iframes first
        const allIframes = chatEmbedArea.querySelectorAll('iframe');
        allIframes.forEach(frame => frame.style.display = 'none');

        let placeholder = chatEmbedArea.querySelector('p.no-chat-selected');
        if (!placeholder) {
            placeholder = document.createElement('p');
            placeholder.classList.add('no-chat-selected');
            // Style it to be visible (assuming styles are in CSS)
            // If not, add basic styling here:
            placeholder.style.color = '#fff'; // Example
            placeholder.style.textAlign = 'center';
            placeholder.style.width = '100%';
            chatEmbedArea.appendChild(placeholder);
        }
        placeholder.textContent = messageText;
        placeholder.style.display = 'block'; // Make sure placeholder is visible
    }


    function renderTabs() {
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
            closeBtn.innerHTML = '&times;';
            closeBtn.title = `Close ${channel.name} tab`;
            closeBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                removeChannel(channel.id);
            });
            tab.appendChild(closeBtn);

            if (channel.id === activeChannelId) {
                tab.classList.add('active');
            }
            tab.addEventListener('click', () => selectChannel(channel.id));
            tabsContainer.appendChild(tab);
        });

        const newTabBtn = document.createElement('button');
        newTabBtn.classList.add('tab', 'new-tab-btn');
        newTabBtn.textContent = 'New +';
        newTabBtn.addEventListener('click', showNewChannelPopup);
        tabsContainer.appendChild(newTabBtn);
    }

    function selectChannel(channelId) {
        // Hide placeholder message if it exists
        const placeholder = chatEmbedArea.querySelector('p.no-chat-selected');
        if (placeholder) {
            placeholder.style.display = 'none';
        }

        // Hide all iframes
        const allIframes = chatEmbedArea.querySelectorAll('iframe');
        allIframes.forEach(frame => {
            if (frame.style.display !== 'none') { // Only log if it was visible
                // console.log(`Hiding iframe: ${frame.id}`);
            }
            frame.style.display = 'none';
        });

        const selectedChannelObject = channels.find(ch => ch.id === channelId);

        if (selectedChannelObject) {
            activeChannelId = selectedChannelObject.id;
            let targetIframe = document.getElementById(`iframe-${selectedChannelObject.id}`);

            if (!targetIframe) {
                // This case should ideally be handled by creating iframes upon channel addition/initialization
                console.warn(`Iframe for ${selectedChannelObject.id} not found, creating now.`);
                targetIframe = createAndStoreIframe(selectedChannelObject.id); // Create if missing
            }

            if (targetIframe) {
                // console.log(`Showing iframe: ${targetIframe.id}`);
                targetIframe.style.display = 'block'; // Or 'flex' or 'initial' depending on layout
            } else {
                // Fallback if iframe creation also failed for some reason
                displayNoChatSelectedMessage(`Error: Could not load chat for ${selectedChannelObject.name}.`);
            }
        } else {
            activeChannelId = null; // No valid channel selected
            if (channels.length === 0) {
                displayNoChatSelectedMessage("No channels. Add a new channel to begin.");
            } else {
                displayNoChatSelectedMessage("Select a channel to view chat.");
            }
        }
        renderTabs(); // Re-render tabs to update active state
    }

    function removeChannel(channelIdToRemove) {
        const indexToRemove = channels.findIndex(ch => ch.id === channelIdToRemove);
        if (indexToRemove === -1) return;

        // Remove iframe from DOM
        const iframeToRemove = document.getElementById(`iframe-${channelIdToRemove}`);
        if (iframeToRemove) {
            // console.log(`Removing iframe: ${iframeToRemove.id}`);
            iframeToRemove.remove();
        }

        const wasActive = (activeChannelId === channelIdToRemove);
        channels.splice(indexToRemove, 1);

        if (wasActive) {
            activeChannelId = null;
            if (channels.length > 0) {
                activeChannelId = channels[0].id; // Select the first channel if one exists
            }
        }
        // No need to re-check activeChannelId validity here, selectChannel will handle it.
        selectChannel(activeChannelId); // This will display the new active iframe or placeholder
    }

    function handleAddNewChannel() {
        const newName = newChannelNameInput.value.trim();
        if (newName) {
            const newChannelId = newName.toLowerCase().replace(/[^a-z0-9_]/g, '');
            if (!newChannelId) {
                console.warn("Channel name results in an invalid ID (use letters, numbers, underscore).");
                return;
            }
            if (channels.some(ch => ch.id === newChannelId || ch.name.toLowerCase() === newName.toLowerCase())) {
                console.warn("Channel name or ID already exists!");
                return;
            }
            channels.push({ name: newName, id: newChannelId });
            createAndStoreIframe(newChannelId); // Create the iframe, it will be hidden by default
            hideNewChannelPopup();
            selectChannel(newChannelId); // This will make the new channel active and show its iframe
        } else {
            console.warn("Please enter a channel name.");
        }
    }

    newChannelNameInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleAddNewChannel();
        }
    });

    function handlePopupEscapeKey(event) {
        if (newChannelPopup.style.display === 'flex' && event.key === 'Escape') {
            hideNewChannelPopup();
        }
    }

    function showNewChannelPopup() {
        newChannelNameInput.value = '';
        newChannelPopup.style.display = 'flex';
        newChannelNameInput.focus();
        document.addEventListener('keydown', handlePopupEscapeKey);
    }

    function hideNewChannelPopup() {
        newChannelPopup.style.display = 'none';
        document.removeEventListener('keydown', handlePopupEscapeKey);
    }

    addChannelBtn.addEventListener('click', handleAddNewChannel);
    cancelAddChannelBtn.addEventListener('click', hideNewChannelPopup);

    newChannelPopup.addEventListener('click', (event) => {
        if (event.target === newChannelPopup) {
            hideNewChannelPopup();
        }
    });

    // --- Initial Setup ---
    // Create iframes for all initially defined channels
    channels.forEach(channel => {
        createAndStoreIframe(channel.id);
    });

    // Select the first channel by default if any exist
    if (channels.length > 0) {
        selectChannel(channels[0].id);
    } else {
        selectChannel(null); // This will display the "No channels" message
    }
});
