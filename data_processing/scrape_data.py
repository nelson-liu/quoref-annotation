import argparse
import json
import hashlib
import random

import wikipedia
import requests
from bs4 import BeautifulSoup
import tqdm
import ftfy
import spacy


random.seed(12345)

NOVELS_LIST = "https://en.wikipedia.org/w/index.php?title=Category:English_novels"
MOVIES_LIST = "https://en.wikipedia.org/w/index.php?title=Category:English-language_films"

MIN_PASSAGE_LENGTH = 1000  # Number of characters
MAX_PASSAGE_LENGTH = 2000  # Number of characters

titles = []

nlp = spacy.load("en")


def remove_actor_names(passage):
    """
    Some of the movie plot summaries have actor names in them. We do not want annotators to write questions about
    those names, so we remove them here.  Actor names mostly occur in parantheses right next to character names. We
    use a high precision pattern here to identify them. The recall is not expected to be perfect, but ishould be
    good enough.
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


def scrape_link(link_string):
    html = requests.get(link_string)
    souped_html = BeautifulSoup(html.text, 'lxml')

    next_page_link = None
    for list_item in souped_html.find_all(name='li'):
        for link in list_item.find_all('a', href=True):
            link_href = link['href']
            if link_href.startswith('/wiki/'):
                # We do not want links to pages that are "File"s, "Category"s, "Portal"s, etc.
                link_text = link_href.split('/')[2]
                if ":" in link_text:
                    page_type = link_text.split(":")[0]
                    if page_type in ["Category", "File", "Portal", "Wikipedia", "Special", "Help"]:
                        continue
                titles.append(link.contents[0])

    for link in souped_html.find_all(name='a'):
        link_contents = link.contents
        if link_contents and link_contents[0] == "next page":
            link_href = link['href']
            next_page_link = f"https://en.wikipedia.org{link_href}"
    return next_page_link


def populate_titles(root_link):
    while root_link:
        print(f"Following {root_link}")
        root_link = scrape_link(root_link)


def make_data(args):
    populate_titles(NOVELS_LIST)
    populate_titles(MOVIES_LIST)

    print(f"Found {len(titles)} titles")
    random.shuffle(titles)
    print(f"Kept {args.max_num_pages} titles")
    filtered_titles = titles[:args.max_num_pages]

    summary_headers = ['Plot', 'Summary', 'Plot summary', 'Synopsis', 'Plot synopsis']
    data = {}
    for title in tqdm.tqdm(filtered_titles):
        summary = None
        try:
            wikipedia_page = wikipedia.WikipediaPage(title)
            page_url = wikipedia_page.url
            for header in summary_headers:
                if wikipedia_page.section(header) is not None:
                    summary = wikipedia_page.section(header)
                    break
        except:
            continue
        if summary is not None and len(summary) > MIN_PASSAGE_LENGTH:
            # Fix unicode issues in passage
            fixed_passage = ftfy.fix_text(summary)
            paragraphs = fixed_passage.split("\n")
            paragraphs_to_keep = []
            len_so_far = 0
            for paragraph in paragraphs:
                if len(paragraph) + len_so_far < MAX_PASSAGE_LENGTH:
                    paragraphs_to_keep.append(paragraph)
                    len_so_far += len(paragraph)
                else:
                    break
            filtered_passage = remove_actor_names("\n".join(paragraphs_to_keep))
            passage_id = hashlib.sha1(filtered_passage.encode()).hexdigest()
            passage_data = {"title": title,
                            "passage": filtered_passage,
                            "url": page_url}
            data[passage_id] = passage_data
    print(f"Kept {len(data)} passages")
    with open(args.output_file, "w") as output_file:
        json.dump(data, output_file, indent=2)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('output_file', type=str, help='Location of output file')
    parser.add_argument('--max-num-pages', type=int, dest="max_num_pages", default=10000,
                        help="""Not all pages may have summaries of the right length.
                                This is the maximum number of pages we'll consider. The
                                number of summaries will be smaller than this number.""")
    args = parser.parse_args()
    make_data(args)
