// Function to handle the search button click
document.querySelector('.btn').addEventListener('click', function() {
    // Get the input value
    const searchTerm = document.getElementById('st1').value.trim();

    // Check if the input is not empty
    if (searchTerm === '') {
        alert('Please enter a search term.');
        return;
    }

    // Fetch the content of the text file
    fetch('data/torahNoSpaces.txt')
        .then(response => response.text())
        .then(data => {
            // Perform the search
            const regex = new RegExp(searchTerm, 'gi'); // Create a case-insensitive regex
            const matches = data.match(regex);

            // Display search results
            const resultDiv = document.getElementById('test');
            if (matches) {
                resultDiv.innerHTML = `Found ${matches.length} occurrences of <strong>${searchTerm}</strong>`;
            } else {
                resultDiv.innerHTML = `No occurrences of <strong>${searchTerm}</strong> found.`;
            }
        })
        .catch(error => {
            console.error('Error loading the text file:', error);
        });

    // Clear the input field after the search
    document.getElementById('st1').value = '';
});
