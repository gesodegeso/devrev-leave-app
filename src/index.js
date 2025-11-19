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

const credentialsFactory = new ConfigurationServiceClientCredentialFactory(credentialConfig);

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
  console.error('Error stack:', error.stack);
  console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

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
    console.log("[DevRev Webhook] Received event:", JSON.stringify(req.body, null, 2));

    const event = req.body;

    // Verify webhook signature if configured
    const webhookSecret = process.env.DEVREV_WEBHOOK_SECRET;
    if (webhookSecret) {
      // TODO: Implement signature verification with req.headers['x-devrev-signature']
      console.log("[DevRev Webhook] Signature verification not yet implemented");
    }

    // Handle custom object created event or work item created event
    if (event.type === 'custom_object.created' || event.type === 'work.created') {
      const workItem = event.custom_object || event.work;

      if (!workItem) {
        console.log("[DevRev Webhook] No work item found in event");
        res.send(200, { status: "ok" });
        return;
      }

      // Check if it's a leave_request
      // For custom objects: check leaf_type
      // For tickets: check subtype name or custom field tnt__request_type
      const isLeaveRequest =
        workItem.leaf_type === 'leave_request' ||
        workItem.subtype === 'leave_request' ||
        (workItem.custom_fields && (
          workItem.custom_fields.tnt__request_type === 'leave_request' ||
          workItem.custom_fields.request_type === 'leave_request'
        ));

      if (isLeaveRequest) {
        console.log("[DevRev Webhook] Leave request created:", workItem.id);

        // Send approval request to approver
        await bot.handleLeaveRequestCreated(workItem);
      } else {
        console.log("[DevRev Webhook] Not a leave request, skipping");
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
