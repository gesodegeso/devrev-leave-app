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

// Create bot framework authentication
const botFrameworkAuthentication = new ConfigurationBotFrameworkAuthentication(
  {},
  credentialsFactory
);

// Create adapter with CloudAdapter (recommended)
const adapter = new CloudAdapter(botFrameworkAuthentication);

// Error handler
adapter.onTurnError = async (context, error) => {
  console.error(`\n [onTurnError] unhandled error: ${error}`);
  console.error(error);

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
const bot = new TeamsLeaveBot();

// Listen for incoming requests
server.post("/api/messages", async (req, res) => {
  await adapter.process(req, res, async (context) => {
    await bot.run(context);
  });
});

// Health check endpoint
server.get("/health", (req, res, next) => {
  res.send(200, { status: "healthy" });
  next();
});
