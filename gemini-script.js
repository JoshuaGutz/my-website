// In script.js

document.addEventListener('DOMContentLoaded', () => {
    const chatEmbedArea = document.getElementById('chat-embed-area');
    const tabsContainer = document.getElementById('tabs-container');
    const newChannelPopup = document.getElementById('new-channel-popup');
    const newChannelNameInput = document.getElementById('new-channel-name');
    const addChannelBtn = document.getElementById('add-channel-btn');
    const cancelAddChannelBtn = document.getElementById('cancel-add-channel-btn');

    let channels = [
        { name: "deemonrider", id: "deemonrider" }, 
        { name: "malice_dumpling", id: "malice_dumpling" }
        // { name: "asdf", id: "asdf" } 
    ];

    let activeChannelId = null;

/*
    // --- USER'S JAVASCRIPT FOR COUNTDOWN AND SPRITE ---
    <script src="../bettertimer.js"></script>
    <script src="../sprite.js"></script>
    function updateCountdownDisplay(timeString) {
        const countdownEl = document.getElementById('countdown');
        if (countdownEl) {
            countdownEl.textContent = timeString;
        }
    }

    function updateSpriteImageSource(imageUrl) {
        const spriteImgEl = document.getElementById('sprite-image');
        if (spriteImgEl) {
            spriteImgEl.src = imageUrl;
            // Optional: if you want to adjust sprite-container height based on actual image
            // spriteImgEl.onload = () => {
            //     const spriteContainer = document.querySelector('.sprite-container');
            //     if (spriteContainer) {
            //         // This is a bit more complex; for now, fixed height in CSS is simpler
            //         // spriteContainer.style.height = spriteImgEl.clientHeight + 'px';
            //     }
            // }
        }
    }
    // --- END USER'S JAVASCRIPT ---
*/

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
            closeBtn.innerHTML = '&times;'; // '×' character
            closeBtn.title = `Close ${channel.name} tab`;
            closeBtn.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent tab selection when clicking close
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
        const selectedChannel = channels.find(ch => ch.id === channelId);

        if (selectedChannel) {
            activeChannelId = selectedChannel.id; // Set activeChannelId only if channel is found
            const twitchParent = window.location.hostname || 'localhost';
            chatEmbedArea.innerHTML = `
                <iframe
                    src="https://www.twitch.tv/embed/${selectedChannel.id}/chat?parent=${twitchParent}&darkpopout"
                    >
                </iframe>`;
                    // height="100%"
                    // width="100%"
        } else {
            activeChannelId = null; // Explicitly nullify if no valid channel selected/found
            if (channels.length === 0) {
                chatEmbedArea.innerHTML = '<p class="no-chat-selected">No channels. Add a new channel to begin.</p>';
            } else {
                chatEmbedArea.innerHTML = '<p class="no-chat-selected">Select a channel to view chat.</p>';
            }
        }
        renderTabs(); // Re-render to update active tab style and content
    }

    function removeChannel(channelIdToRemove) {
        const indexToRemove = channels.findIndex(ch => ch.id === channelIdToRemove);
        if (indexToRemove === -1) return; // Channel not found

        const wasActive = (activeChannelId === channelIdToRemove);
        channels.splice(indexToRemove, 1); // Remove the channel from the array

        if (wasActive) {
            activeChannelId = null; // Clear the active channel ID
            if (channels.length > 0) {
                // Default to selecting the new first channel if the active one was removed
                activeChannelId = channels[0].id;
            }
        } else if (activeChannelId && !channels.find(ch => ch.id === activeChannelId)) {
            // This case handles if somehow activeChannelId is stale (should not happen with current logic but good safeguard)
            activeChannelId = channels.length > 0 ? channels[0].id : null;
        }
        // If a non-active channel was removed, activeChannelId remains valid and unchanged (unless it became stale above).

        selectChannel(activeChannelId); // selectChannel will handle null activeChannelId and re-render tabs
    }

    function showNewChannelPopup() {
        newChannelNameInput.value = '';
        newChannelPopup.style.display = 'flex';
        newChannelNameInput.focus();
    }

    function hideNewChannelPopup() {
        newChannelPopup.style.display = 'none';
    }

    addChannelBtn.addEventListener('click', () => {
        const newName = newChannelNameInput.value.trim();
        if (newName) {
            const newChannelId = newName.toLowerCase().replace(/[^a-z0-9_]/g, ''); // Basic sanitization for ID
            if (!newChannelId) {
                alert("Channel name results in an invalid ID (use letters, numbers, underscore).");
                return;
            }
            if (channels.some(ch => ch.id === newChannelId || ch.name.toLowerCase() === newName.toLowerCase())) {
                alert("Channel name or ID already exists!");
                return;
            }
            channels.push({ name: newName, id: newChannelId });
            hideNewChannelPopup();
            selectChannel(newChannelId);
            // Consider saving 'channels' to localStorage here
        } else {
            alert("Please enter a channel name.");
        }
    });

    cancelAddChannelBtn.addEventListener('click', hideNewChannelPopup);

    newChannelPopup.addEventListener('click', (event) => {
        if (event.target === newChannelPopup) {
            hideNewChannelPopup();
        }
    });

    // Initial setup
    if (channels.length > 0) {
        selectChannel(channels[0].id);
    } else {
        selectChannel(null); // Handles empty initial state
    }
});