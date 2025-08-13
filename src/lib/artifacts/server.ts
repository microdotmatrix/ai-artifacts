import { createDocumentHandler } from "@/lib/ai/artifacts";
import { updateDocumentPrompt } from "@/lib/ai/prompts";
import { providers } from "@/lib/ai/providers";
import { smoothStream, streamText } from "ai";

export const textDocumentHandler = createDocumentHandler<"text">({
  kind: "text",
  onCreateDocument: async ({ title, context, dataStream }) => {
    let draftContent = "";

    // Enhanced system prompt for better content generation, especially for obituaries
    const systemPrompt = `You are a skilled writer creating content based on the given topic or request. 

      If the request is for an obituary:
      - Use all the specific details provided in the prompt
      - Write in a respectful, dignified tone
      - Include proper obituary structure (announcement of death, life details, survivors, etc.)
      - Make it personal and meaningful
      - Do not add information not provided in the request
      - Focus on celebrating the person's life and legacy

      For other content:
      - Write comprehensive, well-structured content
      - Use markdown formatting where appropriate
      - Include headings to organize the content
      - Make the content engaging and informative

      Always use the full context and details provided in the prompt to create rich, complete content.
    `;

    const { fullStream } = streamText({
      model: providers.languageModel("openai-artifact"),
      system: systemPrompt,
      experimental_transform: smoothStream({ chunking: "word" }),
      prompt: context || title, // Use context if provided, otherwise fall back to title
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === "text-delta") {
        const { text } = delta;

        draftContent += text;

        dataStream.write({
          type: "data-textDelta",
          data: text,
          transient: true,
        });
      }
    }

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    let draftContent = "";

    // Enhanced system prompt for targeted document updates
    const systemPrompt = `${updateDocumentPrompt(document.content)}

      ADDITIONAL CONTEXT FOR TEXT DOCUMENTS:
      - This is a text document that may contain structured content like obituaries, articles, or other written material
      - Pay special attention to paragraph structure and maintain the original formatting
      - If updating an obituary, preserve the respectful tone and structure while making only the requested changes
      - Ensure the updated content flows naturally with the existing text

      Remember: Your goal is to make ONLY the specific changes requested while keeping everything else exactly the same.
    `;

    const { fullStream } = streamText({
      model: providers.languageModel("openai-artifact"),
      system: systemPrompt,
      experimental_transform: smoothStream({ chunking: "word" }),
      prompt: description,
      providerOptions: {
        openai: {
          prediction: {
            type: "content",
            content: document.content,
          },
        },
      },
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === "text-delta") {
        const { text } = delta;

        draftContent += text;

        dataStream.write({
          type: "data-textDelta",
          data: text,
          transient: true,
        });
      }
    }

    return draftContent;
  },
});
