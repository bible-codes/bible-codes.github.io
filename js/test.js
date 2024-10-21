// Function to handle the button click
document.querySelector('.btn').addEventListener('click', function() {
    // Get the input value
    const searchTerm = document.getElementById('st1').value;

    // Check if the input is not empty
    if (searchTerm.trim() === '') {
        alert('Please enter a search term.');
        return;
    }

    // Perform a mock search operation (You can replace this with actual search logic)
    const resultDiv = document.getElementById('test');
    resultDiv.innerHTML = `You searched for: <strong>${searchTerm}</strong>`;
    
    // Here you could add functionality to search through the content of the iframe
    // For example, fetching the text from torahNoSpaces.txt and searching it

    // Clear the input field after the search
    document.getElementById('st1').value = '';
});
