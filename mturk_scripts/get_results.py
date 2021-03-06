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

    passages = json.load(open(args.data_file))
    existing_files = set()
    if not os.path.exists(args.output_path):
        os.makedirs(args.output_path)
    else:
        for filename in os.listdir(args.output_path):
            if filename.endswith("json"):
                existing_files.add(filename)

    output_path = f"{args.output_path}/to_review"
    if not os.path.exists(output_path):
        os.makedirs(output_path)

    num_submissions_all_hits = 0
    if args.hit_ids:
        wanted_hit_ids = args.hit_ids
    elif args.hit_ids_file:
        wanted_hit_ids = [x.strip() for x in open(args.hit_ids_file)]
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
        raise RuntimeError("Require either HITIds or HITGroupId to get results!")


    all_hits_data = []
    all_worker_ids = set()
    for hit_id in wanted_hit_ids:
        hit = mturk.get_hit(HITId=hit_id)['HIT']
        worker_results = mturk.list_assignments_for_hit(HITId=hit_id, AssignmentStatuses=['Submitted', 'Approved'],
                                                        MaxResults=100)
        num_submissions = worker_results['NumResults']
        num_pending = hit['NumberOfAssignmentsPending']
        num_available = hit['NumberOfAssignmentsAvailable']
        print(f"""Number of submissions for {hit_id} so far: {num_submissions}\n"""
              f"""\t{num_pending} are pending, {num_available} are available\n""")
        num_submissions_all_hits += num_submissions

        if num_submissions > 0:
            for assignment in worker_results['Assignments']:
                hit_data = defaultdict(list)
                xml_doc = xmltodict.parse(assignment['Answer'])
                submit_time = str(assignment['SubmitTime'])
                worker_id = assignment['WorkerId']
                all_worker_ids.add(worker_id)
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
                        passage_metadata = passages[global_passage_id]
                        passage_data["passage"] = passage_metadata["passage"]
                        passage_data["title"] = passage_metadata["title"]
                        passage_data["url"] = passage_metadata["url"]
                        passage_data["question_answer_pairs"] = qa_data
                        hit_data_with_lists['passages'].append(passage_data)
                hit_data_with_lists['worker_id'] = worker_id
                hit_data_with_lists['submission_time'] = submit_time
                all_hits_data.append(hit_data_with_lists)

    if args.group_by_worker:
        for worker_id in all_worker_ids:
            worker_grouped_hits = []
            for hit_data in all_hits_data:
                if hit_data['worker_id'] == worker_id:
                    worker_grouped_hits.append(hit_data)
            output_filename = f"{worker_id}.json"
            if output_filename not in existing_files:
                output_file = os.path.join(output_path, output_filename)
                with open(output_file, "w") as output_file:
                    json.dump(worker_grouped_hits, output_file, indent=2)

    else:
        output_filename = f"{args.group_id}.json" if args.group_id is not None else "all_results.json"
        output_file = os.path.join(args.output_path, output_filename)
        with open(output_file, "w") as output_file:
            json.dump(all_hits_data, output_file, indent=2)

    print(f"Total number of submissions in the group: {num_submissions_all_hits}")


if __name__ == "__main__":
    argparser = argparse.ArgumentParser()
    argparser.add_argument('--group-id', type=str, dest="group_id", help="""Group ID of HITs to look at. Either
                           provide this or HITids to get results.""")
    argparser.add_argument('--hit-ids', type=str, dest="hit_ids", nargs="+", help="""HITIds of HITs to look at. Either
                           provide these, a HITIds file, or a HITGroupid to get results.""")
    argparser.add_argument('--hit-ids-file', type=str, dest="hit_ids_file", help="""File with HITIds of HITs to look at. Either
                           provide this or a HITGroupid to get results.""")
    argparser.add_argument('--data-file', type=str, dest="data_file", help="Path to file containing paragraphs", required=True)
    argparser.add_argument('--output-directory', type=str, dest="output_path",
                           help="Path where outputs are written", required=True)
    argparser.add_argument('--access-key-file', dest='access_key_file', type=str, required=True)
    argparser.add_argument('--get-sandbox-results', action='store_true', dest='use_sandbox',
                           help='Get results from sandbox?')
    argparser.add_argument('--group-by-worker', action='store_true', dest='group_by_worker',
                           help='Group output by workers?')
    args = argparser.parse_args()
    main(args)
