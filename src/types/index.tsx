export interface Message {
  role: "user" | "assistant";
  content: string;
}
export interface FullMessage extends Message {
  sources?: string[];
}
