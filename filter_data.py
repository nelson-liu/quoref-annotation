import sys
import csv
import json

# Takes summaries from narrative qa, and truncates them till a paragraph boundary such that there are at most 3000
# characters in the passage.

# Assuming this file is the one with summaries from the narrativeqa dataset
reader = csv.reader(open(sys.argv[1]))
all_passages = [row[2].strip() for row in reader if row[1] == "train"]
filtered_passages = []

for passage in all_passages:
    paragraphs = passage.split("\n")
    paragraphs_to_keep = []
    len_so_far = 0
    for paragraph in paragraphs:
        if len(paragraph) + len_so_far < 3000:
            paragraphs_to_keep.append(paragraph)
            len_so_far += len(paragraph)
        else:
            break
    filtered_passages.append("\n".join(paragraphs_to_keep))

json_output = {"passages": filtered_passages}

json.dump(json_output, open(sys.argv[2], "w"))
