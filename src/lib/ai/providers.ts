import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { customProvider } from "ai";

export const providers = customProvider({
  languageModels: {
    "openai-chat": openai("gpt-4o-mini"),
    "openai-artifact": openai("gpt-4o"),
    "anthropic-chat": anthropic("claude-3-5-sonnet-20240620"),
    "anthropic-artifact": anthropic("claude-3-5-sonnet-20240620"),
  },
});
