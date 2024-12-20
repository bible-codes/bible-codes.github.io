// Load the Torah text file and display it in the text box
document.addEventListener("DOMContentLoaded", () => {
    const torahTextElement = document.getElementById("torah-text");
    const wrapLengthInput = document.getElementById("wrap-length");
    const applyWrapButton = document.getElementById("apply-wrap");
  
    // Fetch the Torah text file
    fetch('data/torah.txt')
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch the Torah text.');
        return response.text();
      })
      .then(text => {
        torahTextElement.textContent = text;
  
        // Apply dynamic wrapping
        applyWrapButton.addEventListener("click", () => {
          const wrapLength = parseInt(wrapLengthInput.value, 10);
          if (!isNaN(wrapLength) && wrapLength > 0) {
            const wrappedText = wrapText(text, wrapLength);
            torahTextElement.textContent = wrappedText;
          } else {
            alert("Please enter a valid positive integer for the row length.");
          }
        });
      })
      .catch(error => {
        torahTextElement.textContent = `Error: ${error.message}`;
      });
  });
  
  // Function to wrap text after N characters
  function wrapText(text, rowLength) {
    const lines = [];
    for (let i = 0; i < text.length; i += rowLength) {
      lines.push(text.slice(i, i + rowLength));
    }
    return lines.join("\n");
  }
  