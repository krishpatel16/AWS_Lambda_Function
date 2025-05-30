import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS,POST,PUT,DELETE,PATCH',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Amz-Security-Token',
    'Content-Type': 'application/json',
};

const ddbClient = new DynamoDBClient({ region: "eu-west-2" });

export const handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'CORS preflight OK' }),
        };
    }

    try {
        let roomName, deviceName, turnOffTime, turnOnTime;
        if (event.queryStringParameters) {
            roomName = event.queryStringParameters.roomName;
            deviceName = event.queryStringParameters.deviceName;
            turnOffTime = event.queryStringParameters.turnOffTime;
            turnOnTime = event.queryStringParameters.turnOnTime;
        }
        if (event.body) {
            let body;
            try {
                body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
            } catch (err) {
                return {
                    statusCode: 400,
                    headers: CORS_HEADERS,
                    body: JSON.stringify({ message: 'Invalid JSON format in request body' }),
                };
            }
            roomName = roomName || body.roomName;
            deviceName = deviceName || body.deviceName;
            turnOffTime = turnOffTime || body.turnOffTime;
            turnOnTime = turnOnTime || body.turnOnTime;
        }
        if (!roomName || !deviceName || !turnOffTime || !turnOnTime) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Missing required fields: roomName, deviceName, turnOffTime, or turnOnTime' }),
            };
        }
        const params = {
            TableName: 'ScheduleDev',
            Item: marshall({
                roomName,
                deviceName,
                turnOnTime,
                turnOffTime,
                createdAt: new Date().toISOString(),
            }),
        };
        await ddbClient.send(new PutItemCommand(params));
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Schedule saved successfully' }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Internal server error', error: error.message }),
        };
    }
};