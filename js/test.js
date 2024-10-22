document.getElementById('searchBtn').addEventListener('click', function() {
    const searchTerm = document.getElementById('st1').value;
    const minRange = parseInt(document.getElementById('minRange').value, 10) || -10000; // Default if NaN
    const maxRange = parseInt(document.getElementById('maxRange').value, 10) || 10000; // Default if NaN
  
    if (searchTerm.trim() === "") {
      alert("Please enter a search term.");
      return;
    }
  
    // Check if the provided ranges are valid
    if (minRange < -10000 || maxRange > 10000 || minRange >= maxRange) {
      alert("Please enter a valid range.");
      return;
    }
  
    // Perform search functionality (this is where you will implement your search logic)
    document.getElementById('test').innerText = `Searching for "${searchTerm}" within range ${minRange} to ${maxRange}...`;
  
    // Here you would implement the logic to handle searching through your data
  });
  