export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}
export interface FullMessage extends Message {
  sources?: string[];
}
