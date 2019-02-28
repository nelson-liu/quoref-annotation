import argparse

import boto3
from bs4 import BeautifulSoup


MTURK_SANDBOX = 'https://mturk-requester-sandbox.us-east-1.amazonaws.com'
MTURK_PROD = 'https://mturk-requester.us-east-1.amazonaws.com'


def main(args):
    endpoint_url = MTURK_PROD if args.publish_for_real else MTURK_SANDBOX

    mturk = boto3.client('mturk',
                         aws_access_key_id=args.access_key,
                         aws_secret_access_key=args.secret_access_key,
                         region_name='us-east-1',
                         endpoint_url=endpoint_url)

    print("Available balance:", mturk.get_account_balance()['AvailableBalance'])
    css = open(args.css_file, 'r').read()
    java_script = open(args.java_script_file, 'r').read()
    html_content = open(args.html_file, 'r').read()
    html_body = BeautifulSoup(html_content, 'html.parser').body
    question_xml = f"""<HTMLQuestion xmlns="http://mechanicalturk.amazonaws.com/AWSMechanicalTurkDataSchemas/2011-11-11/HTMLQuestion.xsd">
                    <HTMLContent><![CDATA[
                    <!-- YOUR HTML BEGINS -->
                    <!DOCTYPE html>
                    <html>
                    <head>
                    <meta http-equiv='Content-Type' content='text/html; charset=UTF-8'/>
                    <style>
                    {css}
                    </style>
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

    print(question_xml, file=open("/tmp/sample_question.xml", "w"))
    description = "Write questions based on the narratives and provide answers. It should take around 30-45 mins"
    for qid in range(30):
        new_hit = mturk.create_hit(
            Title='Questions about narratives',
            Description=description,
            Keywords='question answering',
            Reward='5.0',
            MaxAssignments=5,
            LifetimeInSeconds=172800,
            AssignmentDurationInSeconds=172800,
            AutoApprovalDelayInSeconds=259200,
            # AutoApprovalDelayInSeconds=86400,
            Question=question_xml,
            QualificationRequirements=[
                # Master Qualification Sandbox 2ARFPLSP75KLA8M8DH1HTEQVJT3SY6
                # Master Qualification for Prod 2F1QJWKUDD8XADTFD2Q0G6UTO95ALH
                # {
                #     'QualificationTypeId': '2F1QJWKUDD8XADTFD2Q0G6UTO95ALH',
                #     'Comparator': 'Exists', 
                # },
                #Qualification for US
                {
                    'QualificationTypeId': '00000000000000000071',
                    'Comparator': 'EqualTo', 
                    'LocaleValues':[{
                          'Country':'US'
                      }]
                }
                ## Good tuker pool for NFL
                # {
                #       'QualificationTypeId':"3M3HXOD6K9394JG7PUA1AFZAEAR7IR",
                #       'Comparator': 'EqualTo',
                #       'IntegerValues':[100]
                # }
                ## Good tuker pool for History GT
                # {
                #       'QualificationTypeId':"3LRUXMYH0RF97HQYFONT1VJZK4J29O",
                #       'Comparator': 'EqualTo',
                #       'IntegerValues':[100]
                # }            
            ],
        )
        print("{0}\t{1}\t{2}".format("NFL_"+str(qid),
                                     "https://worker.mturk.com/mturk/preview?groupId=" + new_hit['HIT']['HITGroupId'],
                                     new_hit['HIT']['HITId']))
    print("Available balance:", mturk.get_account_balance()['AvailableBalance'])

if __name__ == "__main__":
    argparser = argparse.ArgumentParser()
    argparser.add_argument('--html-file', dest='html_file', type=str, required=True)
    argparser.add_argument('--css-file', dest='css_file', type=str, required=True)
    argparser.add_argument('--java-script-file', dest='java_script_file', type=str, required=True)
    argparser.add_argument('--access-key', dest='access_key', type=str, required=True)
    argparser.add_argument('--secret-access-key', dest='secret_access_key', type=str, required=True)
    argparser.add_argument('--publish-for-real', action='store_true', dest='publish_for_real',
                           help='Publish to production?')
    args = argparser.parse_args()
    main(args)
