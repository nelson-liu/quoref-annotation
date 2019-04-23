import argparse
import datetime

import boto3
from bs4 import BeautifulSoup


MTURK_SANDBOX = 'https://mturk-requester-sandbox.us-east-1.amazonaws.com'
MTURK_PROD = 'https://mturk-requester.us-east-1.amazonaws.com'


def main(args):
    if args.publish_for_real:
        log_file = open("./prod_publish_log.txt", "a+")
    else:
        log_file = open("./sandbox_publish_log.txt", "a+")
    endpoint_url = MTURK_PROD if args.publish_for_real else MTURK_SANDBOX
    access_key_info = open(args.access_key_file).readlines()
    access_key, secret_access_key = access_key_info[-1].strip().split(",")

    mturk = boto3.client('mturk',
                         aws_access_key_id=access_key,
                         aws_secret_access_key=secret_access_key,
                         region_name='us-east-1',
                         endpoint_url=endpoint_url)

    print("Available balance:", mturk.get_account_balance()['AvailableBalance'])
    css = open(args.css_file, 'r').read()
    java_script_code = []
    for java_script_file in args.java_script_files:
        java_script_code.append(open(java_script_file, 'r').read())
    java_script = '\n'.join(java_script_code)
    html_content = open(args.html_file, 'r').read()
    html_body = BeautifulSoup(html_content, 'html.parser').body
    question_xml = f"""<HTMLQuestion xmlns="http://mechanicalturk.amazonaws.com/AWSMechanicalTurkDataSchemas/2011-11-11/HTMLQuestion.xsd">
                    <HTMLContent><![CDATA[
                    <!-- YOUR HTML BEGINS -->
                    <!DOCTYPE html>
                    <html>
                    <head>
                    <meta http-equiv='Content-Type' content='text/html; charset=UTF-8'/>
                    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
                    <!-- Bootstrap CSS -->
                    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css">
                    <style>
                    {css}
                    </style>
                    <!-- jQuery first, then Popper.js, then Bootstrap JS -->
                    <script src="https://code.jquery.com/jquery-3.3.1.min.js"></script>
                    <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.7/umd/popper.min.js"></script>
                    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/js/bootstrap.min.js"></script>
                    <script>
                    {java_script}
                    </script>
                    <script type='text/javascript' src='https://s3.amazonaws.com/mturk-public/externalHIT_v1.js'></script>
                    </head>
                    {html_body}
                    </html>
                    <!-- YOUR HTML ENDS -->
                    ]]>
                    </HTMLContent>
                    <FrameHeight>1600</FrameHeight>
                    </HTMLQuestion>"""

    description = """Each HIT should take about 30 mins. Please note that an earlier version of this HIT had an issue
    with the submit button, which is now fixed."""
    #Qualification for US
    qualification_requirements = [
        {
            'QualificationTypeId': '00000000000000000071',
            'Comparator': 'EqualTo', 
            'LocaleValues':[{
                'Country':'US'
            }]
        }
    ]
    if args.require_masters:
        prod_masters_qualification = {
            'QualificationTypeId': '2F1QJWKUDD8XADTFD2Q0G6UTO95ALH',
            'Comparator': 'Exists',
        }
        sandbox_masters_qualification = {
            'QualificationTypeId': '2ARFPLSP75KLA8M8DH1HTEQVJT3SY6',
            'Comparator': 'Exists',
        }
        qualification_requirements.append(prod_masters_qualification if args.publish_for_real else
                                          sandbox_masters_qualification)

    if args.include_quals:
        for qualification_string in args.include_quals:
            qualification = {
                'QualificationTypeId': qualification_string,
                'Comparator': 'Exists',
            }
            qualification_requirements.append(qualification)

    if args.exclude_quals:
        for qualification_string in args.exclude_quals:
            qualification = {
                'QualificationTypeId': qualification_string,
                'Comparator': 'DoesNotExist',
            }
            qualification_requirements.append(qualification)

    print("Qualification requirements:", qualification_requirements)
    print(f"\n{datetime.datetime.now()}\n------------------------", file=log_file)
    print("Qualification requirements:", qualification_requirements, file=log_file)
    for qid in range(args.num_hits):
        new_hit = mturk.create_hit(
            Title='Tracking Entities in Narratives',
            Description=description,
            Keywords='question answering',
            Reward='7.0',
            MaxAssignments=args.max_assignments,
            LifetimeInSeconds=432000, # 5 days
            AssignmentDurationInSeconds=86400, # 1 day
            AutoApprovalDelayInSeconds=432000, # 5 days
            Question=question_xml,
            QualificationRequirements=qualification_requirements,
        )
        url_prefix = "worker" if args.publish_for_real else "workersandbox"
        group_id = new_hit["HIT"]["HITGroupId"]
        url = f"https://{url_prefix}.mturk.com/mturk/preview?groupId={group_id}"
        hit_id = new_hit["HIT"]["HITId"]
        print(f"quoref_{qid}\t{url}\t{hit_id}", file=log_file)
    log_file.close()
    print("Available balance:", mturk.get_account_balance()['AvailableBalance'])

if __name__ == "__main__":
    argparser = argparse.ArgumentParser()
    argparser.add_argument('--html-file', dest='html_file', type=str, required=True)
    argparser.add_argument('--css-file', dest='css_file', type=str, required=True)
    argparser.add_argument('--java-script-files', dest='java_script_files',
                           type=str, nargs='+', required=True)
    argparser.add_argument('--access-key-file', dest='access_key_file', type=str, required=True)
    argparser.add_argument('--publish-for-real', action='store_true', dest='publish_for_real',
                           help='Publish to production?')
    argparser.add_argument('--num-hits', dest='num_hits', type=int, default=1,
                           help='Number of HITs to publish (default 1)')
    argparser.add_argument('--max-assignments', dest='max_assignments', type=int, default=20,
                           help='Maximum number of workers per HIT (default 20)')
    argparser.add_argument('--require-masters', action='store_true', dest='require_masters',
                           help='Require masters qualification?')
    argparser.add_argument('--include-quals', type=str, dest='include_quals', nargs="+",
                           help='Any other qualifications to include')
    argparser.add_argument('--exclude-quals', type=str, dest='exclude_quals', nargs="+",
                           help='Any qualifications to exclude')
    args = argparser.parse_args()
    main(args)
