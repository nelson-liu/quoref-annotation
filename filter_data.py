import argparse
import sys
import csv
import json

import spacy
import ftfy

argparser = argparse.ArgumentParser("Take summaries from NarrativeQA and process them")
argparser.add_argument('--data-path', type=str,
                       help=("Path to CSV file with summaries from the NarrativeQA "
                             "dataset."), required=True)
argparser.add_argument('--output-path', type=str,
                       help=("Path to JSON file of passages to write out."), required=True)
args = argparser.parse_args()

nlp = spacy.load("en")

def remove_actor_names(passage):
    """
    Some of the passages in NarrativeQA are summaries of movie plots, and have the actor names in
    them. We do not want annotators to write questions about those names, so we remove them here.
    Actor names mostly occur in parantheses right next to character names. We use a high precision
    pattern here to identify them. The recall is not expected to be perfect, but ishould be good
    enough.
    """
    doc = nlp(passage)
    all_actor_names = []
    start_index = None
    keep_track = False
    for i, word in enumerate(doc):
        if i != 0 and doc[i-1].pos_ in ["PROPN", "NOUN"] and  word.lemma_ == "(":
            start_index = word.idx
            keep_track = True
        elif keep_track:
            if word.lemma_ != ")":
                # All the words within the actor's name should be proper nouns, punctuation (e.g. hyphens),
                # or adpositions (e.g. de)
                if word.pos_ not in ["PROPN", "ADP", "PUNCT"]:
                    start_index = None
                    keep_track = False
            else:
                end_index = word.idx
                # We start at start_index - 1 because we also want to get the space before the
                # actor's name, which also needs to be removed.
                assert passage[start_index-1] == " "
                actor_name = passage[start_index - 1 : end_index + 1]
                all_actor_names.append(actor_name)
                temp_buffer = []
                keep_track = False
    for actor_name in all_actor_names:
        passage = passage.replace(actor_name, "")
    return passage


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
        if len(paragraph) + len_so_far < 2000:
            paragraphs_to_keep.append(paragraph)
            len_so_far += len(paragraph)
        else:
            break
    filtered_passage = remove_actor_names("\n".join(paragraphs_to_keep))
    filtered_passages.append(filtered_passage)

json_output = {"passages": filtered_passages}

json.dump(json_output, open(args.output_path, "w"))
