import { IoTDataPlaneClient, PublishCommand } from "@aws-sdk/client-iot-data-plane";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS,POST,PUT,DELETE,PATCH',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent',
  'Content-Type': 'application/json',
};

const client = new IoTDataPlaneClient({
  region: "eu-west-2",
  endpoint: "https://a23kp0hoi8uuhr-ats.iot.eu-west-2.amazonaws.com"
});

export const handler = async (event) => {
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Invalid JSON body" })
    };
  }

  const { deviceId, state, brightness } = body;

  if (!deviceId || !state || typeof brightness !== "number") {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: "Missing or invalid fields. 'deviceId' and 'state' must be strings, 'brightness' must be a number"
      })
    };
  }

  const payload = JSON.stringify({
    state: state,
    brightness: brightness
  });

  const topic = `smarthome/commands/${deviceId}`;

  const command = new PublishCommand({
    topic,
    payload: Buffer.from(payload),
    qos: 0
  });

  try {
    await client.send(command);
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "Published successfully" })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: error.message })
    };
  }
};
