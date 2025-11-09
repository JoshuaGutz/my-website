document.addEventListener('DOMContentLoaded', () => {
    const chatEmbedArea = document.getElementById('chat-embed-area');
    const tabsContainer = document.getElementById('tabs-container');
    const bottomSection = document.querySelector('.bottom-section');
    const pageContainer = document.querySelector('.page-container');
    const newChannelPopup = document.getElementById('new-channel-popup');
    const newChannelNameInput = document.getElementById('new-channel-name');
    const addChannelBtn = document.getElementById('add-channel-btn');
    const cancelAddChannelBtn = document.getElementById('cancel-add-channel-btn');

    // Initial channels
    let channels = [
        { name: "malice_dumpling", id: "malice_dumpling" },
        { name: "deemonrider", id: "deemonrider" },
        { name: "cpayne881 ", id: "cpayne881 " }
        // { name: "jonaswagern", id: "jonaswagern" }
        // { name: "gamester366", id: "gamester366" }
    ];

    let activeChannelId = null;

    // Helper function to create and store an iframe for a channel
    function createAndStoreIframe(channelId) {
        if (document.getElementById(`iframe-${channelId}`)) {
            return document.getElementById(`iframe-${channelId}`);
        }
        const iframe = document.createElement('iframe');
        iframe.id = `iframe-${channelId}`;
        iframe.dataset.channelId = channelId;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.style.display = 'none';
        const twitchParent = window.location.hostname || 'localhost';
        iframe.src = `https://www.twitch.tv/embed/${channelId}/chat?parent=${twitchParent}&darkpopout`;
        chatEmbedArea.appendChild(iframe);
        return iframe;
    }

    function displayNoChatSelectedMessage(messageText) {
        const allIframes = chatEmbedArea.querySelectorAll('iframe');
        allIframes.forEach(frame => frame.style.display = 'none');
        let placeholder = chatEmbedArea.querySelector('p.no-chat-selected');
        if (!placeholder) {
            placeholder = document.createElement('p');
            placeholder.classList.add('no-chat-selected');
            placeholder.style.color = '#fff';
            placeholder.style.textAlign = 'center';
            placeholder.style.width = '100%';
            chatEmbedArea.appendChild(placeholder);
        }
        placeholder.textContent = messageText;
        placeholder.style.display = 'block';
    }

    function renderTabs() {
        tabsContainer.innerHTML = '';
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
        const placeholder = chatEmbedArea.querySelector('p.no-chat-selected');
        if (placeholder) {
            placeholder.style.display = 'none';
        }
        const allIframes = chatEmbedArea.querySelectorAll('iframe');
        allIframes.forEach(frame => {
            frame.style.display = 'none';
        });
        const selectedChannelObject = channels.find(ch => ch.id === channelId);
        if (selectedChannelObject) {
            activeChannelId = selectedChannelObject.id;
            let targetIframe = document.getElementById(`iframe-${selectedChannelObject.id}`);
            if (!targetIframe) {
                targetIframe = createAndStoreIframe(selectedChannelObject.id);
            }
            if (targetIframe) {
                targetIframe.style.display = 'block';
            } else {
                displayNoChatSelectedMessage(`Error: Could not load chat for ${selectedChannelObject.name}.`);
            }
        } else {
            activeChannelId = null;
            displayNoChatSelectedMessage(channels.length === 0 ? "No channels. Add a new channel to begin." : "Select a channel to view chat.");
        }
        renderTabs();
    }

    function removeChannel(channelIdToRemove) {
        const indexToRemove = channels.findIndex(ch => ch.id === channelIdToRemove);
        if (indexToRemove === -1) return;
        const iframeToRemove = document.getElementById(`iframe-${channelIdToRemove}`);
        if (iframeToRemove) {
            iframeToRemove.remove();
        }
        const wasActive = (activeChannelId === channelIdToRemove);
        channels.splice(indexToRemove, 1);
        if (wasActive) {
            activeChannelId = channels.length > 0 ? channels[0].id : null;
        }
        selectChannel(activeChannelId);
    }

    function handleAddNewChannel() {
        const newName = newChannelNameInput.value.trim();
        if (newName) {
            const newChannelId = newName.toLowerCase().replace(/[^a-z0-9_]/g, '');
            if (!newChannelId || channels.some(ch => ch.id === newChannelId || ch.name.toLowerCase() === newName.toLowerCase())) {
                console.warn("Channel name is invalid or already exists.");
                return;
            }
            channels.push({ name: newName, id: newChannelId });
            createAndStoreIframe(newChannelId);
            hideNewChannelPopup();
            selectChannel(newChannelId);
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
        if (event.target === newChannelPopup) hideNewChannelPopup();
    });

    channels.forEach(channel => createAndStoreIframe(channel.id));
    selectChannel(channels.length > 0 ? channels[0].id : null);

    // --- Keyboard Visibility & Resizing Logic ---
    const initialWindowHeight = window.innerHeight;
    
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            const newHeight = window.visualViewport.height;
            // If the viewport height is significantly smaller, assume keyboard is open.
            if (newHeight < initialWindowHeight * 0.9) { 
                pageContainer.style.height = `${newHeight}px`;
                // tabsContainer.style.display = 'none';
                bottomSection.style.display = 'none';
            } else {
                // Keyboard is closed, revert to original layout.
                pageContainer.style.height = '100dvh'; // Use dynamic viewport height
                // tabsContainer.style.display = 'flex';
                bottomSection.style.display = 'block'; // Or flex, depending on its original display
            }
        });
    }
});
