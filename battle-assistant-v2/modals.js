
/*
*/

const modalHTML = `
<div id="channelModal" onclick="focusModalTextBox()">
    <div id="modalContent">
        <h2>Type Custom Channel or Hit Enter For Deemon's</h2>
        <input type="text" id="channelNameInput" placeholder="Custom Channel" /><br>
        <button id="goToChannelBtn">Custom Channel</button><br>
        <button id="goToDeemonriderBtn">DeemonRider</button><br>
        <button id="goToJonaswagernBtn">Jonaswagern</button><br>
        <button id="closeModalBtn">Close</button>
    </div>
</div>`;

document.body.insertAdjacentHTML('beforeend', modalHTML);

// Function to focus on the text box
function focusModalTextBox() {
    document.getElementById('channelNameInput').focus();
}

// Function to open the modal and focus on the input
document.getElementById("openExtensionBtn").addEventListener("click", function() {
    event.stopPropagation(); // Prevents the body onclick from firing
    document.getElementById("channelModal").style.display = "block";
    document.getElementById("channelNameInput").value = "";
    focusModalTextBox()
});

// Function to close the modal
function closeModal() {
    document.getElementById("channelNameInput").value = "";
    document.getElementById("channelModal").style.display = "none";
}

// Function to navigate to channel
function navigateToChannel(channelName = '') {
    // If no channelName is provided or if it's empty, default to deemonrider
    const finalChannelName = channelName.trim() || 'DeemonRider';
    const url = `https://www.twitch.tv/popout/${finalChannelName}/extensions/pm0qkv9g4h87t5y6lg329oam8j7ze9/panel`;
    window.open(
        url, 
        '', 
        'width=300,height=702,menubar=no,toolbar=no,location=no,status=no,scrollbars=no,resizable=yes'
    );
    closeModal()
}

// Add event listener for the Enter key
document.getElementById("channelNameInput").addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        event.preventDefault(); // Prevent form submission if in a form
        const channelName = document.getElementById("channelNameInput").value;
        navigateToChannel(channelName); // Call the function to navigate
    }
});

document.getElementById("goToChannelBtn").addEventListener("click", function() {
    const channelName = document.getElementById("channelNameInput").value;
    navigateToChannel(channelName);
});

document.getElementById("goToDeemonriderBtn").addEventListener("click", function() {
    navigateToChannel(); // Defaults to 'DeemonRider'
});

document.getElementById("goToJonaswagernBtn").addEventListener("click", function() {
    navigateToChannel('Jonaswagern'); // Navigate to 'Jonaswagern'
});

// Add event listener for the close button
document.getElementById("closeModalBtn").addEventListener("click", function() {
    closeModal();
});

// Add event listener for the Esc key
document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
        closeModal()
    }
});
