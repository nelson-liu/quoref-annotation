import argparse
import json
import hashlib
import random
import sys
from collections import defaultdict

random.seed(12345)

def main(args):
    all_data = []
    for data_file in args.data_files:
        data = json.load(open(data_file))
        all_data.extend(data)
    reformatted_data = []
    if args.sample:
        random_sample = all_data[random.randint(0, len(all_data) - 1)]
        all_data = [random_sample]
    grouped_passages = defaultdict(list)
    for datum in all_data:
        for passage_info in datum["passages"]:
            passage = passage_info["passage"]
            reformatted_passage_info = {"context": passage,
                                        "passage_id": passage_info["question_answer_pairs"][0]["passageID"],
                                        "passage_title": passage_info["title"],
                                        "passage_url": passage_info["url"],
                                        "qas": []}
            for qa_pair in passage_info["question_answer_pairs"]:
                question = qa_pair["question"]
                passage_question_combo = f"{passage} {question}"
                question_id = hashlib.sha1(passage_question_combo.encode()).hexdigest()
                reformatted_qa_info = {"question": qa_pair["question"],
                                       "id": question_id,
                                       "answers": []}
                answer_spans = qa_pair["answer"]["spans"] 
                answer_indices = qa_pair["answer"]["indices"]
                should_skip = False
                for span, indices in zip(answer_spans, answer_indices):
                    try:
                        answer_start = int(indices.split(",")[0][1:])
                    except ValueError:
                        print(f"Skipping {qa_pair}", file=sys.stderr)
                        should_skip = True
                        break
                    reformatted_answer_info = {"text": span,
                                               "answer_start": answer_start}
                    reformatted_qa_info["answers"].append(reformatted_answer_info)
                if should_skip:
                    continue

                reformatted_passage_info["qas"].append(reformatted_qa_info)

            grouped_passages[reformatted_passage_info["passage_id"]].append(reformatted_passage_info)

    for key, grouped_passages in grouped_passages.items():
        # Assuming only one passage per Wikipedia page. True for movie plots only.
        reformatted_datum = {"title": grouped_passages[0]["passage_title"],
                             "url": grouped_passages[0]["passage_url"],
                             "paragraphs": [{"context": grouped_passages[0]["context"],
                                             "qas": []}]}
        for passage_info in grouped_passages:
            for qa_info in passage_info["qas"]:
                reformatted_datum["paragraphs"][0]["qas"].append(qa_info)
        reformatted_data.append(reformatted_datum)

    if args.split:
        num_passages = len(reformatted_data)
        train_size = int(0.8 * num_passages)
        random.shuffle(reformatted_data)
        train_data = reformatted_data[:train_size]
        dev_data = reformatted_data[train_size:]
        train_file_name = args.output_file.replace(".json", "") + "_train.json"
        dev_file_name = args.output_file.replace(".json", "") + "_dev.json"
        with open(train_file_name, "w") as output_file:
            json.dump({"data": train_data}, output_file, indent=2)
        with open(dev_file_name, "w") as output_file:
            json.dump({"data": dev_data}, output_file, indent=2)

        num_train_questions = sum([len(d["paragraphs"][0]["qas"]) for d in train_data])
        num_dev_questions = sum([len(d["paragraphs"][0]["qas"]) for d in dev_data])
        print(f"Wrote {len(train_data)} passages in train with {num_train_questions} questions")
        print(f"Wrote {len(dev_data)} passages in dev with {num_dev_questions} questions")
    else:
        json.dump({"data": reformatted_data}, open(args.output_file, "w"), indent=2)
        num_questions = sum([len(d["paragraphs"][0]["qas"]) for d in reformatted_data])
        print(f"Wrote {len(reformatted_data)} passages in train with {num_questions} questions")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-files", dest="data_files", type=str, nargs="+", help="Output of get_results.py",
                        required=True)
    parser.add_argument("--output-file", dest="output_file", type=str, required=True)
    parser.add_argument("--sample", action="store_true", help="Only output a small sample")
    parser.add_argument("--split", action="store_true", help="Split into train and dev (80 -20 split)")
    args = parser.parse_args()
    main(args)
