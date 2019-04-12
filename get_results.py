import argparse
import json
import sys
import os
from collections import defaultdict

import boto3
import xmltodict

MTURK_SANDBOX = 'https://mturk-requester-sandbox.us-east-1.amazonaws.com'
MTURK_PROD = 'https://mturk-requester.us-east-1.amazonaws.com'

def main(args):
    endpoint_url = MTURK_SANDBOX if args.use_sandbox else MTURK_PROD
    access_key_info = open(args.access_key_file).readlines()
    access_key, secret_access_key = access_key_info[-1].strip().split(",")

    endpoint_url = MTURK_SANDBOX if args.use_sandbox else MTURK_PROD
    mturk = boto3.client('mturk',
                         aws_access_key_id = access_key,
                         aws_secret_access_key = secret_access_key,
                         region_name='us-east-1',
                         endpoint_url = endpoint_url
                        )

    passages = json.load(open(args.data_file))["passages"]
    if not os.path.exists(args.output_path):
        os.makedirs(args.output_path)

    num_submissions_all_hits = 0
    if args.hit_ids:
        wanted_hit_ids = args.hit_ids
    elif args.group_id:
        wanted_hit_ids = []
        all_hits = mturk.list_hits(MaxResults=100)['HITs']
        wanted_hits = []
        for hit in all_hits:
            if hit['HITGroupId'] == args.group_id:
                wanted_hits.append(hit)

        if not wanted_hits:
            print(f"No HITs found in group: {args.group_id}")

        for hit in wanted_hits:
            hit_id = hit['HITId']
            wanted_hit_ids.append(hit_id)
    else:
        raise RuntimeError("Require either HITid or HITGroupId to get results!")


    all_hits_data = []
    for hit_id in wanted_hit_ids:
        worker_results = mturk.list_assignments_for_hit(HITId=hit_id, AssignmentStatuses=['Submitted', 'Approved'],
                                                        MaxResults=100)
        num_submissions = worker_results['NumResults']
        print(f"Number of Submissions for {hit_id} so far: {num_submissions}\n")
        num_submissions_all_hits += num_submissions

        if num_submissions > 0:
            for assignment in worker_results['Assignments']:
                hit_data = defaultdict(list)
                xml_doc = xmltodict.parse(assignment['Answer'])
                worker_id = assignment['WorkerId']
                if type(xml_doc['QuestionFormAnswers']['Answer']) is list:
                    # Multiple fields in HIT layout
                    for answer_field in xml_doc['QuestionFormAnswers']['Answer']:
                        field_id = answer_field['QuestionIdentifier']
                        if field_id != "generated_answers":
                            continue
                        if not answer_field['FreeText']:
                            continue
                        data = json.loads(answer_field['FreeText'])
                        for key, value in data.items():
                            if key == "feedback":
                                hit_data["feedback"] = value
                            else:
                                local_passage_id = key.split('-')[0]
                                hit_data[local_passage_id].append(value)
                        # TODO: Handle feedback

                hit_data_with_lists = {'passages': [], 'hit_id': hit_id}
                for key, value in hit_data.items():
                    if key == "feedback":
                        hit_data_with_lists["feedback"] = value
                    elif value:
                        qa_data = value
                        passage_data = {}
                        global_passage_id = qa_data[0]['passageID']
                        passage_data["passage"] = passages[global_passage_id]
                        passage_data["question_answer_pairs"] = qa_data
                        hit_data_with_lists['passages'].append(passage_data)
                hit_data_with_lists['worker_id'] = worker_id
                all_hits_data.append(hit_data_with_lists)

    output_filename = f"{args.group_id}.json" if args.group_id is not None else "hit_group.json"
    output_file = os.path.join(args.output_path, output_filename)
    with open(output_file, "w") as output_file:
        json.dump(all_hits_data, output_file, indent=2)

    print(f"Total number of submissions in the group: {num_submissions_all_hits}")


if __name__ == "__main__":
    argparser = argparse.ArgumentParser()
    argparser.add_argument('--group-id', type=str, dest="group_id", help="""Group ID of HITs to look at. Either
                           provide this or HITids to get results.""")
    argparser.add_argument('--hit-ids', type=str, dest="hit_ids", nargs="+", help="""HITIds of HITs to look at. Either
                           provide these or a HITGroupid to get results.""")
    argparser.add_argument('--data-file', type=str, dest="data_file", help="Path to file containing paragraphs", required=True)
    argparser.add_argument('--output-directory', type=str, dest="output_path",
                           help="Path where outputs are written", required=True)
    argparser.add_argument('--access-key-file', dest='access_key_file', type=str, required=True)
    argparser.add_argument('--get-sandbox-results', action='store_true', dest='use_sandbox',
                           help='Get results from sandbox?')
    args = argparser.parse_args()
    main(args)
