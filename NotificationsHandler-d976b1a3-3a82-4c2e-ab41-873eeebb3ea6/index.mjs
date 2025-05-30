import { DynamoDBClient, PutItemCommand, QueryCommand, BatchWriteItemCommand, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

const TABLE_NAME = "Notifications";
const client = new DynamoDBClient({});

export const handler = async (event) => {
  const method = event.httpMethod;

  // CORS preflight
  if (method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "*"
      },
      body: ""
    };
  }

  // POST: Add a notification
  if (method === "POST") {
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch (e) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "*"
        },
        body: "Invalid JSON"
      };
    }
    const { username, message, device, room, turnOnTime, turnOffTime } = body;
    if (!username || !message || !device || !room || !turnOnTime || !turnOffTime) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "*"
        },
        body: "Missing fields"
      };
    }
    const timestamp = new Date().toISOString();
    try {
      const item = marshall({ username, timestamp, message, device, room, turnOnTime, turnOffTime });
      await client.send(new PutItemCommand({ TableName: TABLE_NAME, Item: item }));
      return {
        statusCode: 201,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "*"
        },
        body: JSON.stringify({ message: "Notification saved" })
      };
    } catch (err) {
      console.error("DynamoDB error:", err);
      return {
        statusCode: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "*"
        },
        body: "Internal server error"
      };
    }
  }

  // GET: Fetch notifications for a user
  if (method === "GET") {
    const username = event.queryStringParameters?.username;
    if (!username) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "*"
        },
        body: JSON.stringify({ error: "Missing username" })
      };
    }
    try {
      const params = {
        TableName: TABLE_NAME,
        KeyConditionExpression: "#uid = :uid",
        ExpressionAttributeNames: { "#uid": "username" },
        ExpressionAttributeValues: { ":uid": { S: username } }
      };
      const data = await client.send(new QueryCommand(params));
      const items = data.Items ? data.Items.map(unmarshall) : [];
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "*"
        },
        body: JSON.stringify(items)
      };
    } catch (err) {
      console.error("DynamoDB error:", err);
      return {
        statusCode: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "*"
        },
        body: JSON.stringify({ error: "Internal server error" })
      };
    }
  }

  // DELETE: Remove all or one notification for a user
  if (method === "DELETE") {
    const username = event.queryStringParameters?.username;
    const timestamp = event.queryStringParameters?.timestamp;
    if (!username) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "*"
        },
        body: JSON.stringify({ error: "Missing username" })
      };
    }
    // Delete a single notification if timestamp is provided
    if (timestamp) {
      try {
        await client.send(new DeleteItemCommand({
          TableName: TABLE_NAME,
          Key: {
            username: { S: username },
            timestamp: { S: timestamp }
          }
        }));
        return {
          statusCode: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
            "Access-Control-Allow-Headers": "*"
          },
          body: JSON.stringify({ message: "Notification deleted" })
        };
      } catch (err) {
        console.error("DynamoDB error:", err);
        return {
          statusCode: 500,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
            "Access-Control-Allow-Headers": "*"
          },
          body: JSON.stringify({ error: "Internal server error" })
        };
      }
    }
    // Otherwise, delete all notifications for the user
    try {
      const params = {
        TableName: TABLE_NAME,
        KeyConditionExpression: "#uid = :uid",
        ExpressionAttributeNames: { "#uid": "username" },
        ExpressionAttributeValues: { ":uid": { S: username } }
      };
      const data = await client.send(new QueryCommand(params));
      if (data.Items && data.Items.length > 0) {
        const deleteRequests = data.Items.map(item => ({
          DeleteRequest: {
            Key: {
              username: item.username,
              timestamp: item.timestamp
            }
          }
        }));
        while (deleteRequests.length) {
          const batch = deleteRequests.splice(0, 25);
          await client.send(new BatchWriteItemCommand({
            RequestItems: {
              [TABLE_NAME]: batch
            }
          }));
        }
      }
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "*"
        },
        body: JSON.stringify({ message: "All notifications cleared" })
      };
    } catch (err) {
      console.error("DynamoDB error:", err);
      return {
        statusCode: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "*"
        },
        body: JSON.stringify({ error: "Internal server error" })
      };
    }
  }

  return {
    statusCode: 405,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "*"
    },
    body: JSON.stringify({ error: "Method Not Allowed" })
  };
};