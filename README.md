# Metal Tracker

Metal Tracker is a script that fetches and sends email notifications for new concerts, reviews, and news related to the metal music from various sources of interest.

## Prerequisites

Before running the script, ensure you have the following prerequisites set up:

1. **AWS Account**: You must have an AWS account to use the AWS services required for sending email notifications.

2. **AWS Credentials**: [Configure your AWS credentials](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html).

3. **Amazon SNS Topic**: Create an SNS topic in your AWS account with the list of email addresses to which you want to send notifications.

## Getting Started

To execute the Metal Tracker script, follow these steps:

1. Pull the Docker image from the GitHub Container Registry:

   ```bash
   docker pull ghcr.io/casantosmu/metal-tracker:main
   ```

2. Run the Docker container with the required environment variables:

   ```bash
   docker run --rm --name metal-tracker \
     -v metal-tracker-db:/app/sqlite \
     -e AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY_ID \
     -e AWS_SECRET_ACCESS_KEY=YOUR_SECRET_ACCESS_KEY \
     -e AWS_REGION=us-east-1 \
     -e SNS_TOPIC_ARN=YOUR_SNS_TOPIC_ARN \
     ghcr.io/casantosmu/metal-tracker:main
   ```

Replace the placeholders with your actual AWS credentials, AWS region, and SNS topic ARN.

## How It Works

Metal Tracker automates the following tasks:

- **Data Collection**: It fetches data from various sources related to metal music, such as concert listings and music news.

- **Data Storage**: The script saves this data in a database to keep track of previously fetched information.

- **Notification**: When new data is available, Metal Tracker sends email notifications via Amazon SNS to the specified Amazon SNS topic.
