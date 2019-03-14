import argparse
import json
import sys
import os

import boto3
import xmltodict

MTURK_SANDBOX = 'https://mturk-requester-sandbox.us-east-1.amazonaws.com'
MTURK_PROD = 'https://mturk-requester.us-east-1.amazonaws.com'

def main(args):
    endpoint_url = MTURK_SANDBOX if args.use_sandbox else MTURK_PROD
    access_key_info = open(args.access_key_file).readlines()
    access_key, secret_access_key = access_key_info[-1].strip().split(",")

    mturk = boto3.client('mturk',
                         aws_access_key_id = access_key,
                         aws_secret_access_key = secret_access_key,
                         region_name='us-east-1',
                         endpoint_url = MTURK_SANDBOX
                        )

    all_hits = mturk.list_hits(MaxResults=100)['HITs']
    wanted_hits = []
    for hit in all_hits:
        if hit['HITGroupId'] == args.group_id:
            wanted_hits.append(hit)

    if not wanted_hits:
        print(f"No HITs found in group: {args.group_id}")

    num_submissions_all_hits = 0
    passages = json.load(open(args.data_file))["passages"]
    if not os.path.exists(args.output_path):
        os.makedirs(args.output_path)

    for hit in wanted_hits:
        hit_id = hit['HITId']
        worker_results = mturk.list_assignments_for_hit(HITId=hit_id, AssignmentStatuses=['Submitted', 'Approved'])
        num_submissions = worker_results['NumResults']
        print(f"Number of Submissions for {hit_id} so far: {num_submissions}\n")
        num_submissions_all_hits += num_submissions

        if num_submissions > 0:
            for assignment in worker_results['Assignments']:
                hit_data = {}
                xml_doc = xmltodict.parse(assignment['Answer'])
                worker_id = assignment['WorkerId']
                worker_id_file = os.path.join(args.output_path, f"{worker_id}.json")
                if type(xml_doc['QuestionFormAnswers']['Answer']) is list:
                    # Multiple fields in HIT layout
                    for answer_field in xml_doc['QuestionFormAnswers']['Answer']:
                        field_id = answer_field['QuestionIdentifier']
                        field_value = answer_field['FreeText']
                        if field_id.startswith('passage-id'):
                            local_passage_id = field_id.replace('passage-id-', '')
                            passage = passages[int(field_value)]
                            hit_data[local_passage_id] = {'passage': passage}
                        elif field_id.startswith('input-question'):
                            question_metadata = field_id.replace('input-question-', '').split('-')
                            local_passage_id, question_id = question_metadata
                            hit_data[local_passage_id][question_id] = {'question': field_value,
                                                                       'human-answer': []}
                        elif field_id.startswith('ai-answer'):
                            question_metadata = field_id.replace('ai-answer-', '').split('-')
                            local_passage_id, question_id = question_metadata
                            hit_data[local_passage_id][question_id]['ai-answer'] = field_value
                        elif field_id.startswith('span'):
                            span_metadata = field_id.replace('span-', '').split('-')
                            if len(span_metadata) == 3:
                                local_passage_id, question_id, span_id = span_metadata
                                hit_data[local_passage_id][question_id]['human-answer'].append(field_value)
                        elif field_id.startswith('null'):
                            question_metadata = field_id.replace('null-', '').split('-')
                            local_passage_id, question_id = question_metadata
                            hit_data[local_passage_id][question_id]['human-answer'].append('NO ANSWER')
                        elif field_id == 'feedback':
                            hit_data['feedback'] = field_value

                hit_data_with_lists = {'passages': [], 'hit_id': hit_id}
                for hit_key, hit_value in hit_data.items():
                    if hit_key == 'feedback':
                        hit_data_with_lists['feedback'] = hit_value
                        continue
                    passage_data = {}
                    passage_data["passage"] = hit_value["passage"]
                    passage_data["question_answer_pairs"] = []
                    for passage_info in hit_value.values():
                        if isinstance(passage_info, str):
                            continue
                        passage_data['question_answer_pairs'].append(passage_info)
                    hit_data_with_lists['passages'].append(passage_data)
                with open(worker_id_file, "w") as output_file:
                    json.dump(hit_data_with_lists, output_file, indent=2)

    print(f"Total number of submissions in the group: {num_submissions_all_hits}")


if __name__ == "__main__":
    argparser = argparse.ArgumentParser()
    argparser.add_argument('--group-id', type=str, dest="group_id", help="Group ID of HITs to look at", required=True)
    argparser.add_argument('--data-file', type=str, dest="data_file", help="Path to file containing paragraphs", required=True)
    argparser.add_argument('--output-directory', type=str, dest="output_path",
                           help="Path where outputs are written", required=True)
    argparser.add_argument('--access-key-file', dest='access_key_file', type=str, required=True)
    argparser.add_argument('--get-sandbox-results', action='store_true', dest='use_sandbox',
                           help='Get results from sandbox?')
    args = argparser.parse_args()
    main(args)
