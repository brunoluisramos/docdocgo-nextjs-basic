// components/ChatInterface.tsx
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { env } from "~/env";
import type { Message } from "~/types";

interface ChatInterfaceProps {
  apiUrl: string;
}

const ChatInterface = ({ apiUrl }: ChatInterfaceProps) => {
  const [message, setMessage] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async () => {
    const newMessage: Message = { role: "user", content: message };
    setIsLoading(true);
    setError(null);
    setChatHistory((prev) => [...prev, newMessage]);
    setMessage(""); // clear input field

    try {
      throw new Error("Not implemented");
      const response = await fetch(`${apiUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          api_key: env.NEXT_PUBLIC_DOCDOCGO_API_KEY,
          chat_history: chatHistory,
        }),
      });
      const data = await response.json();

      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", content: data.content },
      ]);
    } catch (error) {
      console.error("Error sending message:", error);
      const msg = error instanceof Error ? error.message : `${error}`;
      setError(`Error sending message:\n\`\`\`\n${msg}\n\`\`\``);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex h-full w-full max-w-4xl flex-col items-center justify-center gap-4">
      <div className="chatBox scrollbar-thumb-rounded-full flex h-full w-full flex-col justify-end overflow-y-auto overflow-x-hidden rounded-lg px-4 scrollbar scrollbar-track-transparent scrollbar-thumb-slate-700 ">
        {chatHistory.map((chat, index) => (
          <div
            key={index}
            className={`mb-2 ${chat.role === "user" ? "text-right" : "text-left"}`}
          >
            <span className="mr-2 font-bold">
              {chat.role === "user" ? "You:" : "DDG:"}
            </span>
            <ReactMarkdown>{chat.content}</ReactMarkdown>
          </div>
        ))}
        {error && (
          <div className="text-red-500 bg-red-100 p-2 rounded-lg">
            <ReactMarkdown>{error}</ReactMarkdown>
          </div>
        )}
      </div>
      <div className="mt-4 flex w-full">
        <input
          type="text"
          placeholder="Type your message here..."
          className="w-full rounded-lg bg-slate-800 px-4 py-2"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={isLoading}
          onKeyPress={(e) => e.key === "Enter" && !isLoading && sendMessage()}
        />
        <button
          className="ml-2 rounded-full bg-white/10 px-10 py-3 font-semibold transition hover:bg-white/20"
          onClick={sendMessage}
          disabled={isLoading}
        >
          {isLoading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
};

export default ChatInterface;
