import re

def append_list_to_file(file_path, string_list):
    with open(file_path, 'a') as file:
        for string in string_list:
            file.write(string + '\n')

def extract_unique_hebrew_words(data):
    pattern = r'[\u0590-\u05FF]+'  # Regular expression to match Hebrew words
    seen_words = set()  # Keep track of seen words

    for match in re.finditer(pattern, data):
        word = match.group().strip().lower()
        if word not in seen_words:
            seen_words.add(word)
            yield word

def read_file_in_chunks(file_path, chunk_size):
    with open(file_path, 'r') as file:
        while True:
            chunk = file.read(chunk_size)
            if not chunk:
                break
            yield chunk

input_file_path = 'hewiki-20230501-pages-articles-multistream.xml'
chunk_size = 1024  # Adjust the chunk size according to your needs
output_file_path = 'output_hebrew_words.txt'
seen_words = set()  # Keep track of seen words

for chunk in read_file_in_chunks(input_file_path, chunk_size):
    unique_hebrew_words = extract_unique_hebrew_words(chunk)
    
    # Filter out already seen words before appending
    unique_hebrew_words = [word for word in unique_hebrew_words if word not in seen_words]
    seen_words.update(unique_hebrew_words)  # Update seen words set
    
    append_list_to_file(output_file_path, unique_hebrew_words)
