require("dotenv").config();
const restify = require("restify");
const {
  CloudAdapter,
  ConfigurationBotFrameworkAuthentication,
  ConfigurationServiceClientCredentialFactory,
} = require("botbuilder");
const { TeamsLeaveBot } = require("./bot");

// Create HTTP server
const server = restify.createServer();
server.use(restify.plugins.bodyParser());

server.listen(process.env.PORT || 3978, () => {
  console.log(`\n${server.name} listening to ${server.url}`);
  console.log("\nBot is ready to receive messages");
});

// Create credential factory for authentication
const credentialConfig = {
  MicrosoftAppId: process.env.MICROSOFT_APP_ID,
  MicrosoftAppPassword: process.env.MICROSOFT_APP_PASSWORD,
  MicrosoftAppType: process.env.MICROSOFT_APP_TYPE || "MultiTenant",
};

// Add TenantId for SingleTenant configuration
if (process.env.MICROSOFT_APP_TENANT_ID) {
  credentialConfig.MicrosoftAppTenantId = process.env.MICROSOFT_APP_TENANT_ID;
}

const credentialsFactory = new ConfigurationServiceClientCredentialFactory(
  credentialConfig
);

// Create bot framework authentication with proper configuration
const botFrameworkAuthentication = new ConfigurationBotFrameworkAuthentication(
  credentialConfig,
  credentialsFactory
);

// Create adapter with CloudAdapter (recommended)
const adapter = new CloudAdapter(botFrameworkAuthentication);

// Error handler
adapter.onTurnError = async (context, error) => {
  console.error(`\n [onTurnError] unhandled error: ${error}`);
  console.error("Error stack:", error.stack);
  console.error(
    "Full error object:",
    JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
  );

  // Send a trace activity
  await context.sendTraceActivity(
    "OnTurnError Trace",
    `${error}`,
    "https://www.botframework.com/schemas/error",
    "TurnError"
  );

  // Send a message to the user
  await context.sendActivity("The bot encountered an error or bug.");
  await context.sendActivity(
    "To continue to run this bot, please fix the bot source code."
  );
};

// Create the bot
const bot = new TeamsLeaveBot(adapter);

// Listen for incoming requests
server.post("/api/messages", async (req, res) => {
  await adapter.process(req, res, async (context) => {
    await bot.run(context);
  });
});

// DevRev Webhook endpoint
server.post("/api/devrev-webhook", async (req, res) => {
  try {
    console.log(
      "[DevRev Webhook] Received raw body type:",
      typeof req.body
    );
    console.log(
      "[DevRev Webhook] Received event:",
      JSON.stringify(req.body, null, 2)
    );

    let event = req.body;

    // Handle double-encoded JSON string from DevRev webhook
    // If body is a string, try to parse it as JSON
    if (typeof event === 'string') {
      console.log("[DevRev Webhook] Body is a string, attempting to parse as JSON");
      try {
        event = JSON.parse(event);
        console.log("[DevRev Webhook] Successfully parsed JSON string");
        console.log("[DevRev Webhook] Parsed event:", JSON.stringify(event, null, 2));
      } catch (parseError) {
        console.error("[DevRev Webhook] Failed to parse JSON string:", parseError);
        console.error("[DevRev Webhook] Raw string:", event);
        res.send(400, { error: "Invalid JSON format" });
        return;
      }
    }

    // Verify webhook signature if configured
    const webhookSecret = process.env.DEVREV_WEBHOOK_SECRET;
    if (webhookSecret) {
      // TODO: Implement signature verification with req.headers['x-devrev-signature']
      console.log(
        "[DevRev Webhook] Signature verification not yet implemented"
      );
    }

    // Handle custom object created event or work item created event
    if (
      event.type === "custom_object.created" ||
      event.type === "work.created"
    ) {
      const workItem = event.custom_object || event.work;

      if (!workItem) {
        console.log("[DevRev Webhook] No work item found in event");
        res.send(200, { status: "ok" });
        return;
      }

      console.log("[DevRev Webhook] Work item details:");
      console.log("[DevRev Webhook] - ID:", workItem.id);
      console.log("[DevRev Webhook] - Type:", workItem.type);
      console.log("[DevRev Webhook] - leaf_type:", workItem.leaf_type);
      console.log("[DevRev Webhook] - subtype:", workItem.subtype);
      console.log("[DevRev Webhook] - custom_fields:", JSON.stringify(workItem.custom_fields, null, 2));

      // Check if it's a leave_request
      // For custom objects: check leaf_type
      // For tickets: check subtype name or custom field tnt__request_type
      const isLeaveRequest =
        workItem.leaf_type === "leave_request" ||
        workItem.subtype === "leave_request" ||
        (workItem.custom_fields &&
          (workItem.custom_fields.tnt__request_type === "leave_request" ||
            workItem.custom_fields.request_type === "leave_request"));

      console.log("[DevRev Webhook] isLeaveRequest check:");
      console.log("[DevRev Webhook] - leaf_type === 'leave_request':", workItem.leaf_type === "leave_request");
      console.log("[DevRev Webhook] - subtype === 'leave_request':", workItem.subtype === "leave_request");
      console.log("[DevRev Webhook] - has custom_fields:", !!workItem.custom_fields);
      if (workItem.custom_fields) {
        console.log("[DevRev Webhook] - tnt__request_type:", workItem.custom_fields.tnt__request_type);
        console.log("[DevRev Webhook] - request_type:", workItem.custom_fields.request_type);
      }
      console.log("[DevRev Webhook] - Final isLeaveRequest:", isLeaveRequest);

      if (isLeaveRequest) {
        console.log("[DevRev Webhook] Leave request created:", workItem.id);

        // Send approval request to approver
        await bot.handleLeaveRequestCreated(workItem);
      } else {
        console.log("[DevRev Webhook] Not a leave request, skipping");
      }
    }

    // Handle work item updated event (for question answers)
    if (event.type === "work.updated") {
      const workItem = event.work;

      if (!workItem) {
        console.log("[DevRev Webhook] No work item found in event");
        res.send(200, { status: "ok" });
        return;
      }

      console.log("[DevRev Webhook] Work item updated:");
      console.log("[DevRev Webhook] - ID:", workItem.id);
      console.log("[DevRev Webhook] - Type:", workItem.type);
      console.log("[DevRev Webhook] - Title:", workItem.title);

      // Check if it's a leave question Issue
      const isLeaveQuestion =
        workItem.type === "issue" &&
        workItem.title &&
        workItem.title.includes("休暇に関する質問");

      if (isLeaveQuestion) {
        console.log("[DevRev Webhook] Leave question updated:", workItem.id);
        console.log("[DevRev Webhook] Checking if answer was added...");

        // Check if the update includes a comment or body change (indicating an answer)
        // We'll treat any update to a question Issue as potentially containing an answer
        await bot.handleQuestionAnswered(workItem);
      } else {
        console.log("[DevRev Webhook] Not a leave question, skipping");
      }
    }

    // Handle timeline entry created event (for question answers via comments)
    if (event.type === "timeline_entry.created") {
      const timelineEntry = event.timeline_entry;

      if (!timelineEntry) {
        console.log("[DevRev Webhook] No timeline entry found in event");
        res.send(200, { status: "ok" });
        return;
      }

      console.log("[DevRev Webhook] Timeline entry created:");
      console.log("[DevRev Webhook] - Type:", timelineEntry.entry_type);
      console.log("[DevRev Webhook] - Object ID:", timelineEntry.object);

      // Check if it's a comment on a work item
      if (timelineEntry.entry_type === "timeline_comment") {
        console.log("[DevRev Webhook] Comment detected on work item:", timelineEntry.object);

        // We need to fetch the work item to check if it's a leave question
        // For now, we'll trigger the notification handler which will validate
        // Note: This might require fetching the work item details via DevRev API
        // to confirm it's a leave question before notifying
        console.log("[DevRev Webhook] Comment added - may need to fetch work item details to confirm if it's a leave question");
      }
    }

    res.send(200, { status: "ok" });
  } catch (error) {
    console.error("[DevRev Webhook] Error:", error);
    res.send(500, { error: error.message });
  }
});

// Health check endpoint
server.get("/health", (req, res, next) => {
  res.send(200, { status: "healthy" });
  next();
});
