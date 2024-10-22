document.getElementById('searchBtn').addEventListener('click', function() {
    const searchTerm = document.getElementById('st1').value;
    const minRange = parseInt(document.getElementById('minRange').value, 10);
    const maxRange = parseInt(document.getElementById('maxRange').value, 10);
  
    if (searchTerm.trim() === "") {
      alert("Please enter a search term.");
      return;
    }
  
    // Perform search functionality (this is where you will implement your search logic)
    // This is just a placeholder for demonstration purposes
    document.getElementById('test').innerText = `Searching for "${searchTerm}" within range ${minRange} to ${maxRange}...`;
  
    // Here you would implement the logic to handle searching through your data
    // For example, you could fetch data from an API or search a local array
  });
  