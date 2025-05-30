# AWS Lambda Smart Home Functions
This repository contains AWS Lambda functions for a smart home system, organized by feature. Each function is in its own directory and is designed to be deployed independently. 

## File Structure
```
AWS_Lambda/
│
├── DeviceUsageLogsFunction-<uuid>/
│   └── index.mjs
│       - Handles device usage logging and querying (DynamoDB).
│
├── IoTCore-<uuid>/
│   └── index.mjs
│       - Processes IoT Core messages (e.g., device ON/OFF commands).
│
├── NotificationsHandler-<uuid>/
│   └── index.mjs
│       - Manages notifications (CRUD operations in DynamoDB).
│
├── ScheduleDeviceFunction-<uuid>/
│   └── index.mjs
│       - Schedules device actions and stores schedules in DynamoDB.
│
└── README.md
```
### Note
Each function folder is named with a unique identifier (UUID) to distinguish between deployments.

### Setup Instructions
Install Node.js
Ensure you have Node.js (v16 or later) installed:
https://nodejs.org/

### Installation

1. **Install AWS SDK**
Each Lambda function uses the AWS SDK v3. In each function directory, run:
npm install @aws-sdk/client-dynamodb @aws-sdk/util-dynamodb

2. **Configure AWS Credentials**
Set up your AWS credentials (via aws configure or environment variables) so the Lambda functions can access DynamoDB.

3. **Deploy Functions to AWS Lambda**
1. Zip the contents of each function directory (including node_modules after installing dependencies).
2. Upload the zip to AWS Lambda via the AWS Console or CLI.
3. Set the handler to index.handler (or index.mjs if using ES modules).
4. Set the runtime to Node.js 16.x or later.

4. **Set Environment Variables**
Update table names or region in the code or via Lambda environment variables as required.

5. **DynamoDB Tables**
Create the following DynamoDB tables in your AWS account:
    DeviceUsageLogs
    Notifications
    ScheduleDev
Ensure the primary keys match those used in the code (e.g., username, timestamp, etc.).

6. **API Gateway**
To expose these functions as REST APIs, set up API Gateway triggers for each Lambda.

## Usage
Each Lambda function expects specific event formats (see code comments).
Test using the AWS Lambda Console or via API Gateway endpoints.
