// import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
// import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

// const client = new DynamoDBClient({});
// const docClient = DynamoDBDocumentClient.from(client);

// export const handler = async (event) => {
//     console.log("Received event:", JSON.stringify(event));

//     try {
//         // Determine if payload is raw object or stringified
//         const payload =
//             typeof event.payload === "string"
//                 ? JSON.parse(event.payload)
//                 : event;

//         const state = (payload.state || "").toUpperCase();

//         if (state !== "ON" && state !== "OFF") {
//             console.warn("Invalid state received:", state);
//             return {
//                 statusCode: 400,
//                 body: JSON.stringify({ message: "Invalid state" })
//             };
//         }

//         const topic = event.topic || "smarthome/commands/led";
//         const deviceId = topic.split("/").pop();

//         const command = new PutCommand({
//             TableName: "DeviceStatus",
//             Item: {
//                 deviceId: deviceId,
//                 timestamp: new Date().toISOString(),
//                 status: state
//             }
//         });

//         await docClient.send(command);
//         console.log(`Stored ${state} state for device ${deviceId}`);

//         return {
//             statusCode: 200,
//             body: JSON.stringify({ message: `Stored LED state: ${state}` })
//         };
//     } catch (error) {
//         console.error("Error processing message:", error);
//         return {
//             statusCode: 500,
//             body: JSON.stringify({ error: error.message })
//         };
//     }
// };


import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
    console.log("Received event:", JSON.stringify(event));

    if (event.httpMethod === "GET" && event.queryStringParameters && event.queryStringParameters.deviceId) {
        const deviceId = event.queryStringParameters.deviceId;
        try {
            const queryCmd = new QueryCommand({
                TableName: "DeviceStatus",
                KeyConditionExpression: "deviceId = :d",
                ExpressionAttributeValues: { ":d": deviceId },
                ScanIndexForward: false, 
                Limit: 1 
            });
            const result = await docClient.send(queryCmd);
            if (!result.Items || result.Items.length === 0) {
                return {
                    statusCode: 404,
                    headers: { "Access-Control-Allow-Origin": "*" },
                    body: JSON.stringify({ message: "Device not found" })
                };
            }
            return {
                statusCode: 200,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify(result.Items[0])
            };
        } catch (error) {
            return {
                statusCode: 500,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ error: error.message })
            };
        }
    }

    try {
        const payload =
            typeof event.payload === "string"
                ? JSON.parse(event.payload)
                : event;

        const state = (payload.state || "").toUpperCase();

        if (state !== "ON" && state !== "OFF") {
            console.warn("Invalid state received:", state);
            return {
                statusCode: 400,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ message: "Invalid state" })
            };
        }

        const topic = event.topic || "smarthome/commands/led";
        const deviceId = topic.split("/").pop();

        const command = new PutCommand({
            TableName: "DeviceStatus",
            Item: {
                deviceId: deviceId,
                timestamp: new Date().toISOString(),
                status: state
            }
        });

        await docClient.send(command);
        console.log(`Stored ${state} state for device ${deviceId}`);

        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: `Stored LED state: ${state}` })
        };
    } catch (error) {
        console.error("Error processing message:", error);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: error.message })
        };
    }
};