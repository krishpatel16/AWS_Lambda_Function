exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event));

  try {
      const payloadStr = event.payload;
      const payload = JSON.parse(payloadStr);
      const state = (payload.state || "").toUpperCase();

      if (state !== "ON" && state !== "OFF") {
          console.warn("Invalid state received:", state);
          return {
              statusCode: 400,
              body: JSON.stringify({ message: "Invalid state" })
          };
      }

      console.log(`LED command received: ${state}`);

      // You can forward this to other services here if needed

      return {
          statusCode: 200,
          body: JSON.stringify({ message: `Received LED command: ${state}` })
      };

  } catch (error) {
      console.error("Error processing message:", error);
      return {
          statusCode: 500,
          body: JSON.stringify({ error: error.message })
      };
  }
};
