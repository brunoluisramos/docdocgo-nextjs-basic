export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}
export interface FullMessage extends Message {
  sources?: string[];
}

// export type AllowedModel = "gpt-3.5-turbo-0125" | "gpt-4-turbo-2024-04-09";

export interface BotSettings {
  llm_model_name: string; // to match the field name needed by the backend
  temperature: number;
}
