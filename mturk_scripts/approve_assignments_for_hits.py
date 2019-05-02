import argparse

import boto3


def main(args):
    endpoint_url = 'https://mturk-requester.us-east-1.amazonaws.com'
    access_key_info = open(args.access_key_file).readlines()
    access_key, secret_access_key = access_key_info[-1].strip().split(",")
    mturk = boto3.client('mturk',
                         aws_access_key_id = access_key,
                         aws_secret_access_key = secret_access_key,
                         region_name='us-east-1',
                         endpoint_url = endpoint_url
                        )
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
        raise RuntimeError("Require either HITIds or HITGroupId!")

    for hit_id in wanted_hit_ids:
        worker_results = mturk.list_assignments_for_hit(HITId=hit_id, AssignmentStatuses=['Submitted'],
                                                        MaxResults=100)
        num_submissions = worker_results['NumResults']
        print(f"Found {num_submissions} submissions that need to be approved for {hit_id}")
        for assignment in worker_results['Assignments']:
            assignment_id = assignment['AssignmentId']
            mturk.approve_assignment(AssignmentId=assignment_id)
    print("Done!")


if __name__ == "__main__":
    argparser = argparse.ArgumentParser()
    argparser.add_argument('--group-id', type=str, dest="group_id", help="""Group ID of HITs to look at. Either
                           provide this or HITids to approve assignments.""")
    argparser.add_argument('--hit-ids', type=str, dest="hit_ids", nargs="+", help="""HITIds of HITs to look at. Either
                           provide these, a HITIds file, or a HITGroupid to approve assignments.""")
    argparser.add_argument('--hit-ids-file', type=str, dest="hit_ids_file", help="""File with HITIds of HITs to look at. Either
                           provide this or a HITGroupid to approve assignments.""")
    argparser.add_argument('--access-key-file', dest='access_key_file', type=str, required=True)
    args = argparser.parse_args()
    main(args)
