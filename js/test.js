document.querySelector('.btn').addEventListener('click', function() {
    const searchTerm = document.getElementById('st1').value;
    const minRange = parseInt(document.getElementById('min-range').value, 10);
    const maxRange = parseInt(document.getElementById('max-range').value, 10);
    
    // Validate inputs
    if (!searchTerm) {
        alert("Please enter a search term.");
        return;
    }
    
    if (isNaN(minRange) || isNaN(maxRange)) {
        alert("Please enter valid numbers for the range.");
        return;
    }
    
    if (minRange > maxRange) {
        alert("Minimum value must be less than or equal to Maximum value.");
        return;
    }

    // Log the search parameters (this is where you'd implement your search logic)
    console.log(`Searching for "${searchTerm}" within range ${minRange} to ${maxRange}...`);
    document.getElementById('test').innerText = `Searching for "${searchTerm}" within range ${minRange} to ${maxRange}...`;
});
