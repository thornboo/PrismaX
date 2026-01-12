import "server-only";

import { ChatService } from "@prismax/core";
import { WebChatRepository } from "@prismax/database";
import { OpenAIProvider } from "@prismax/ai-sdk";

import { db } from "@/db/db";

const chatRepository = new WebChatRepository(db);

const aiProvider = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

export const chatService = new ChatService(chatRepository, aiProvider, null);
