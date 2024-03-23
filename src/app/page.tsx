// pages/index.tsx
"use client";

import { useState } from "react";
import { env } from "~/env";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function HomePage() {
  const [apiUrl, setApiUrl] = useState<string>("http://localhost:5000");
  const [message, setMessage] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [showApiUrl, setShowApiUrl] = useState<boolean>(true);

  const sendMessage = async () => {
    if (!apiUrl) return;

    setChatHistory((prev) => [
      ...prev,
      { role: "user", content: message },
    ]);
    setMessage(""); // Clear input field

    try {
      console.log(chatHistory)
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
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container flex flex-col items-center justify-center gap-4 px-4 py-16">
        <h1 className="text-4xl font-bold sm:text-5xl">
          Doc<span className="text-[hsl(280,100%,70%)]">Doc</span>Go Test
          Interface
        </h1>
        {showApiUrl && (
          <div className="relative w-full max-w-lg">
            <input
              type="text"
              placeholder="Enter Flask API URL"
              className="h-12 w-full rounded-full px-4 py-2 text-black"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value.trim())}
            />
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 transform bg-transparent text-black hover:text-[hsl(280,100%,70%)]"
              onClick={() => setShowApiUrl(false)}
            >
              ✕
            </button>
          </div>
        )}
        <div className="chatBox mt-4 h-64 w-full max-w-2xl overflow-y-auto p-4">
          {chatHistory.map((chat, index) => (
            <div
              key={`chat-msg-${index}`}
              className={`${chat.role === "user" ? "text-right" : "text-left"} mb-2`}
            >
              <span
                className={`font-bold mr-2`}
              >
                {chat.role === "user" ? "You:" : "Bot:"}
              </span>
              {chat.content}
            </div>
          ))}
        </div>
        <div className="mt-4 flex w-full max-w-2xl">
          <input
            type="text"
            placeholder="Type your message here..."
            className="w-full rounded-full px-4 py-2 text-black"
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
    </main>
  );
}
