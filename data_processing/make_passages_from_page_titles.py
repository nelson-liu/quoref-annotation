import sys
import wikipedia
import json
import hashlib
import tqdm
import re
import random

random.seed(12345)
NUM_PAGES = 800
MIN_PASSAGE_LENGTH = 1500
MAX_PASSAGE_LENGTH = 3000


all_data = {}
lines = open(sys.argv[1]).readlines()
titles = []
for line in lines:
    line = line.strip()
    if line.startswith("##") or line == "":
        continue
    titles.append(line)
random.shuffle(titles)
titles = titles[:NUM_PAGES]

for title in tqdm.tqdm(titles):
    try:
        wikipedia_page = wikipedia.page(title=title)
    except wikipedia.exceptions.PageError:
        print(f"Page not found: {title}", file=sys.stderr)
        continue
    page_paragraphs = re.split("\n+", wikipedia_page.content)
    paragraphs_to_keep = []
    len_so_far = 0
    broken_passages = []
    for paragraph in page_paragraphs:
        if paragraph == "":
            continue
        if paragraph.startswith("=="):
            # This is a section title. Refresh the buffer and add to paragraphs_to_keep if what
            # we have is long enough.
            if len_so_far > MIN_PASSAGE_LENGTH:
                broken_passages.append("\n".join(paragraphs_to_keep))
            paragraphs_to_keep = []
            len_so_far = 0
            if paragraph.lower() in ["== see also ==", "== references ==", "== notes =="]:
                # We reached the end of interesting content in the page.
                break
        elif len(paragraph) + len_so_far < MAX_PASSAGE_LENGTH:
            paragraphs_to_keep.append(paragraph)
            len_so_far += len(paragraph)
        elif len_so_far > MIN_PASSAGE_LENGTH:
            broken_passages.append("\n".join(paragraphs_to_keep))
            paragraphs_to_keep = [paragraph]
            len_so_far = len(paragraph)
 
    for num, passage in enumerate(broken_passages):
        passage_id = hashlib.sha1(passage.encode()).hexdigest()
        passage_title = f"{title} {num}"
        passage_url = f"{wikipedia_page.url}"
        all_data[passage_id] = {"passage": passage,
                                "title": passage_title,
                                "url": passage_url}

print(f"Found {len(all_data)} passages")
json.dump(all_data, open(sys.argv[2], "w"), indent=2)
