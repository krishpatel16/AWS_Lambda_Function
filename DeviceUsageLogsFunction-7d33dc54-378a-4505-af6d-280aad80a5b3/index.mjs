import { DynamoDBClient, QueryCommand, ScanCommand, PutItemCommand, BatchWriteItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

const TABLE_NAME = "DeviceUsageLogs";
const client = new DynamoDBClient({});

// Helper functions to convert YYYY-MM-DD to full ISO range
function toStartOfDay(dateStr) {
  return dateStr && dateStr.length === 10 ? `${dateStr}T00:00:00.000Z` : dateStr;
}
function toEndOfDay(dateStr) {
  return dateStr && dateStr.length === 10 ? `${dateStr}T23:59:59.999Z` : dateStr;
}

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

  // GET: fetch logs (optionally by date range, username, or all)
  if (method === "GET") {
    const username = event.queryStringParameters?.username;
    const start = event.queryStringParameters?.startDate;
    const end = event.queryStringParameters?.endDate;
    const all = event.queryStringParameters?.all;

    let items = [];

    if (all === "true") {
      // Admin: scan all logs, optionally filter by username and date
      let scanParams = { TableName: TABLE_NAME };
      const data = await client.send(new ScanCommand(scanParams));
      items = data.Items ? data.Items.map(unmarshall) : [];
      // Filter in-memory for username and date if provided
      items = items.filter(item => {
        let match = true;
        if (username) match = match && item.username === username;
        if (start) match = match && item.timestamp >= toStartOfDay(start);
        if (end) match = match && item.timestamp <= toEndOfDay(end);
        return match;
      });
    } else if (username) {
      // Query by username (and date range)
      let params = {
        TableName: TABLE_NAME,
        KeyConditionExpression: "#uid = :uid",
        ExpressionAttributeNames: { "#uid": "username" },
        ExpressionAttributeValues: { ":uid": { S: username } }
      };
      if (start && end) {
        params.KeyConditionExpression += " AND #ts BETWEEN :start AND :end";
        params.ExpressionAttributeNames["#ts"] = "timestamp";
        params.ExpressionAttributeValues[":start"] = { S: toStartOfDay(start) };
        params.ExpressionAttributeValues[":end"] = { S: toEndOfDay(end) };
      }
      const data = await client.send(new QueryCommand(params));
      items = data.Items ? data.Items.map(unmarshall) : [];
    } else {
      // No username and not admin: reject
      return { statusCode: 400, headers: { "Access-Control-Allow-Origin": "*" }, body: "Missing username or all=true" };
    }

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(items)
    };
  }

  // Parse username from query or body for POST/DELETE
  const username = event.queryStringParameters?.username || (event.body && JSON.parse(event.body).username);

  // POST: add a new log
  if (method === "POST") {
    const { device, room, action, timestamp } = JSON.parse(event.body);
    if (!username || !device || !room || !action || !timestamp) {
      return { statusCode: 400, body: "Missing required log fields" };
    }
    const item = marshall({ username, device, room, action, timestamp });
    await client.send(new PutItemCommand({ TableName: TABLE_NAME, Item: item }));
    return {
      statusCode: 201,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Log added" })
    };
  }

  // DELETE: delete logs in date range
  if (method === "DELETE") {
    const { startDate, endDate } = JSON.parse(event.body || "{}" );
    if (!username || !startDate || !endDate) return { statusCode: 400, body: "Missing username, startDate or endDate" };
    // Query for logs to delete
    const params = {
      TableName: TABLE_NAME,
      KeyConditionExpression: "#uid = :uid AND #ts BETWEEN :start AND :end",
      ExpressionAttributeNames: { "#uid": "username", "#ts": "timestamp" },
      ExpressionAttributeValues: { ":uid": { S: username }, ":start": { S: toStartOfDay(startDate) }, ":end": { S: toEndOfDay(endDate) } }
    };
    const data = await client.send(new QueryCommand(params));
    const items = data.Items ? data.Items.map(unmarshall) : [];
    // Batch delete (max 25 at a time)
    const deleteRequests = items.map(item => ({
      DeleteRequest: { Key: marshall({ username: item.username, timestamp: item.timestamp }) }
    }));
    if (deleteRequests.length > 0) {
      await client.send(new BatchWriteItemCommand({
        RequestItems: { [TABLE_NAME]: deleteRequests }
      }));
    }
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ deleted: deleteRequests.length })
    };
  }

  return { statusCode: 405, body: "Method Not Allowed" };
};
