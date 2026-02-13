import requests

# Function to download and verify the text file
def verify_hebrew_text(url):
    # Define the range of Hebrew characters in Unicode
    hebrew_range = set(chr(i) for i in range(0x05D0, 0x05EB))  # Hebrew letters Alef (U+05D0) to Tav (U+05EA)

    # Download the file
    response = requests.get(url)
    if response.status_code != 200:
        raise Exception(f"Failed to download file. Status code: {response.status_code}")

    # Read the content
    text = response.text

    # Verify that each character is a Hebrew letter
    non_hebrew_characters = set(text) - hebrew_range

    if non_hebrew_characters:
        print("The text contains non-Hebrew characters:", non_hebrew_characters)
    else:
        print("The text contains only Hebrew letters.")

    # Count the total number of letters
    letter_count = len(text)

    print(f"Total number of letters: {letter_count}")

# URL to the Torah text file
url = "https://raw.githubusercontent.com/roni762583/bible-data-science.github.io/master/data/torah_letters_only.txt"

# Run the verification
verify_hebrew_text(url)
