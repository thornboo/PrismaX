export type AgentRunInput = {
  assistantId: string;
  message: string;
  conversationId?: string;
  userId?: string;
};

export type AgentRunResult = {
  response: string;
};

export interface IAgentRuntime {
  run(input: AgentRunInput): Promise<AgentRunResult>;
  dispose?(): Promise<void> | void;
}

