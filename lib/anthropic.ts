import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  throw new Error(
    "ANTHROPIC_API_KEY environment variable is not set.\n" +
      "1. Get your key at: https://console.anthropic.com/account/keys\n" +
      "2. Copy it into the .env.local file in the project root\n" +
      "3. Restart the server"
  );
}

export const client = new Anthropic({
  apiKey,
});
