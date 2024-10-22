document.querySelector('.btn').addEventListener('click', function() {
    const searchTerm = document.getElementById('st1').value;
    const minRangeInput = document.getElementById('min-range');
    const maxRangeInput = document.getElementById('max-range');
    let minRange = parseInt(minRangeInput.value, 10);
    let maxRange = parseInt(maxRangeInput.value, 10);

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
        // Reset to default values
        minRange = -100;
        maxRange = 100;
        minRangeInput.value = minRange;
        maxRangeInput.value = maxRange;
        return;
    }

    // Log the search parameters (this is where you'd implement your search logic)
    console.log(`Searching for "${searchTerm}" within range ${minRange} to ${maxRange}...`);
    document.getElementById('test').innerText = `Searching for "${searchTerm}" within range ${minRange} to ${maxRange}...`;
});
