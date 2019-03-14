import argparse
import sys
import csv
import json

argparser = argparse.ArgumentParser("Take summaries from NarrativeQA, and truncate "
                                    "them until a paragraph boundary, such that there "
                                    "are at most 3000 characters in the passage.")
argparser.add_argument('--data-path', type=str,
                       help=("Path to CSV file with summaries from the NarrativeQA "
                             "dataset."), required=True)
argparser.add_argument('--output-path', type=str,
                       help=("Path to JSON file of passages to write out."), required=True)
args = argparser.parse_args()


# Assuming this file is the one with summaries from the NarrativeQA dataset
reader = csv.reader(open(args.data_path))
all_passages = [row[2].strip() for row in reader if row[1] == "train"]
filtered_passages = []

for passage in all_passages:
    # Fix unicode issues in passage
    fixed_passage = ftfy.fix_text(passage)
    paragraphs = fixed_passage.split("\n")
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

json.dump(json_output, open(args.output_path, "w"))
