/*
*/


// Check if the page name element exists before setting its text content
const pageName = document.getElementById("page_name");
if (pageName) {
    // Get the full URL and extract the last part (file name)
    pageName.textContent = window.location.href.split('/').pop();
}


// Check if the return button exists before adding the event listener
const returnButton = document.getElementById('return-btn');
if (returnButton) {
    // Return button handler to go back to the main page (index)
    returnButton.addEventListener('click', function () {
        window.location.href = 'index.html';  // Replace with actual main page URL
    });
}
