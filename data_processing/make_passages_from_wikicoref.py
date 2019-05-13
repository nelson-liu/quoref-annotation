import os
import sys
import json
import hashlib


data_directory = sys.argv[1]  # Path to the "Documents" directory in the WikiCoref download
output_file = sys.argv[2]  # Output file path

MIN_PASSAGE_LENGTH = 1000
MAX_PASSAGE_LENGTH = 2000

processed_data = {}

for input_filename in os.listdir(data_directory):
    paragraphs = []
    with open(os.path.join(data_directory, input_filename)) as input_file:
        paragraphs.extend([x.strip() for x in input_file])

    paragraphs_to_keep = []
    len_so_far = 0
    broken_passages = []
    for paragraph in paragraphs:
        updated_length = len(paragraph) + len_so_far
        if updated_length < MAX_PASSAGE_LENGTH:
            paragraphs_to_keep.append(paragraph)
            len_so_far += len(paragraph)
        else:
            broken_passages.append("\n".join(paragraphs_to_keep))
            paragraphs_to_keep = [paragraph]
            len_so_far = len(paragraph)

    for num, passage in enumerate(broken_passages):
        passage_id = hashlib.sha1(passage.encode()).hexdigest()
        passage_title = f"{input_filename} {num}"
        passage_url = f"WikiCoref {input_filename}"
        processed_data[passage_id] = {"passage": passage,
                                      "title": passage_title,
                                      "url": passage_url}

print(f"Found {len(processed_data)} passages")
json.dump(processed_data, open(output_file, "w"), indent=2)
