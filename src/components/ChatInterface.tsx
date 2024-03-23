// components/ChatInterface.tsx
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { env } from "~/env";
import type { Message } from "~/types";

interface ChatInterfaceProps {
  apiUrl: string;
}

const ChatInterface= ({ apiUrl }: ChatInterfaceProps) => {
  const [message, setMessage] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<Message[]>([]);

  const sendMessage = async () => {
    const newMessage: Message = { role: "user", content: message };
    setChatHistory((prev) => [...prev, newMessage]);
    setMessage(""); // Clear input field

    try {
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
    }
  };

  return (
<div className="flex w-full max-w-4xl flex-col items-center justify-center gap-4">
  <div className="chatBox mt-4 h-64 w-full overflow-y-auto rounded-lg  p-4">
        {chatHistory.map((chat, index) => (
          <div
            key={index}
            className={`mb-2 ${chat.role === "user" ? "text-right" : "text-left"}`}
          >
            <span className="mr-2 font-bold">
              {chat.role === "user" ? "You:" : "Bot:"}
            </span>
            <ReactMarkdown>{chat.content}</ReactMarkdown>
          </div>
        ))}
      </div>
      <div className="mt-4 flex w-full">
        <input
          type="text"
          placeholder="Type your message here..."
          className="w-full rounded-lg px-4 py-2 bg-teal-800"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          className="ml-2 rounded-full bg-white/10 px-10 py-3 font-semibold transition hover:bg-white/20"
          onClick={sendMessage}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatInterface;
