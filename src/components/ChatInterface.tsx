// components/ChatInterface.tsx
import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { env } from "~/env";
import type { Message } from "~/types";

interface ChatInterfaceProps {
  apiUrl: string;
}

interface RequestBody {
  message: string;
  api_key: string;
  chat_history: Message[];
  collection_name?: string;
}

interface APIResponse {
  content: string;
  collection_name: string;
  user_facing_collection_name: string;
}

interface CollectionInfo {
  name: string;
  user_facing_name: string;
}

const ChatInterface = ({ apiUrl }: ChatInterfaceProps) => {
  const [message, setMessage] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [collection, setCollection] = useState<CollectionInfo>({
    name: "",
    user_facing_name: "default",
  });
  const lastChatRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    console.log("ChatInterface mounted");
    lastChatRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, error]);

  const sendMessage = async () => {
    const newMessage: Message = { role: "user", content: message };
    setIsLoading(true);
    setError(null);
    setChatHistory((prev) => [...prev, newMessage]);
    setMessage(""); // clear input field

    const requestBody: RequestBody = {
      message,
      api_key: env.NEXT_PUBLIC_DOCDOCGO_API_KEY,
      chat_history: chatHistory,
      collection_name: collection.name,
    };
    try {
      const response = await fetch(`${apiUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const data = await response.json() as APIResponse;

      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", content: data.content },
      ]);

      setCollection({
        name: data.collection_name,
        user_facing_name: data.user_facing_collection_name,
      });
    } catch (error) {
      console.error("Error getting response:", error);
      const msg = error instanceof Error ? error.message : String(error);
      setError(`Error getting response:\n\`\`\`\n${msg}\n\`\`\``);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex h-full w-full max-w-4xl flex-col items-center justify-center gap-4">
      <div className="chatBox scrollbar-thumb-rounded-full flex h-full w-full flex-col overflow-y-auto overflow-x-hidden rounded-lg px-4 scrollbar scrollbar-track-transparent scrollbar-thumb-slate-700 ">
        {chatHistory.map((chat, index) => (
          <div
            key={`chatmsg-${index}`}
            ref={index === chatHistory.length - 1 ? lastChatRef : null}
            className={"mb-8"}
          >
            <div className="font-bold text-pink-600 ">
              {chat.role === "user" ? "You:" : "DDG:"}
            </div>
            {/* https://stackoverflow.com/questions/75706164/problem-with-tailwind-css-when-using-the-react-markdown-component */}
            <ReactMarkdown className="prose prose-pink prose-invert">
              {chat.content}
            </ReactMarkdown>
          </div>
        ))}
        {error && (
          <div
            ref={lastChatRef}
            className="mb-8 rounded-lg border border-pink-600 p-2"
          >
            <ReactMarkdown className="prose prose-pink prose-invert">
              {error}
            </ReactMarkdown>
          </div>
        )}
      </div>
      <div className="mt-4 flex w-full">
        <input
          type="text"
          placeholder={
            isLoading
              ? "Awaiting response..."
              : `Collection: ${collection.user_facing_name}`
          }
          className="w-full rounded-lg bg-slate-800 px-4 py-2"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={isLoading}
          onKeyPress={(e) => e.key === "Enter" && !isLoading && sendMessage()}
        />
        <button
          className={`ml-2 rounded-full ${isLoading ? "bg-neutral-500" : "bg-pink-700"} px-8 py-3 font-bold text-white transition hover:${isLoading ? "bg-neutral-500" : "bg-pink-800"}`}
          onClick={sendMessage}
          disabled={isLoading}
        >
          Send
        </button>
      </div>
    </div>
  );
};
// ➤

export default ChatInterface;
