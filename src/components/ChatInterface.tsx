// components/ChatInterface.tsx
import React, { useEffect, useRef, useState, FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import type { Message, FullMessage } from "~/types";

interface ChatInterfaceProps {
  apiUrl: string;
  apiKey: string;
  openaiApiKey?: string;
}

interface RequestBody {
  message: string;
  api_key: string;
  openai_api_key?: string;
  chat_history: Message[];
  collection_name?: string;
}

interface APIResponse {
  content: string;
  collection_name?: string;
  user_facing_collection_name?: string;
  sources?: string[];
}

interface CollectionInfo {
  name: string;
  user_facing_name: string;
}

function getChatHistoryForAPI(fullMessages: FullMessage[]): Message[] {
  return fullMessages.map(({ role, content }) => ({ role, content }));
}

const ChatInterface = ({
  apiUrl,
  apiKey,
  openaiApiKey,
}: ChatInterfaceProps) => {
  apiUrl = apiUrl.replace(/\/$/, ""); // remove trailing slash if present

  const [message, setMessage] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<FullMessage[]>([]);
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

  // Send a regular chat message
  const sendMessage = async () => {
    const newMessage: FullMessage = { role: "user", content: message };
    setChatHistory((prev) => [...prev, newMessage]);

    const requestBody: RequestBody = {
      message,
      api_key: apiKey,
      openai_api_key: openaiApiKey,
      chat_history: getChatHistoryForAPI(chatHistory),
      collection_name: collection.name,
    };
    const payload = JSON.stringify(requestBody);
    await sendRequest(payload, "/chat");
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const newMessage: FullMessage = { role: "user", content: message };
    setChatHistory((prev) => [...prev, newMessage]);

    // Assert that event.target is a form element
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    console.log("message", typeof message, message);
    const dataToAdd: RequestBody = {
      message,
      api_key: apiKey,
      openai_api_key: openaiApiKey,
      chat_history: getChatHistoryForAPI(chatHistory),
      collection_name: collection.name,
    };

    // Add fields to FormData
    for (const [key, value] of Object.entries(dataToAdd)) {
      if (value === undefined) continue;

      // JSON.stringify, even if it's a string. This introduces extra quotes, so
      // we need to json.loads on the Python side even if it's a string. We do this,
      // in particular, because apparently having any of the values as an empty string
      // causes a 422 error on the Python side.
      formData.append(key, JSON.stringify(value));
    }

    await sendRequest(formData, "/ingest");
  }

  const sendRequest = async (payload: string | FormData, endPoint: string) => {
    setIsLoading(true);
    setError(null);
    setMessage(""); // clear input field

    const isJsonPayload = typeof payload === "string";

    try {
      const response = await fetch(`${apiUrl}${endPoint}`, {
        method: "POST",
        headers: isJsonPayload ? { "Content-Type": "application/json" } : {},
        body: payload,
      });

      if (!response.ok) {
        let errorMessage = `HTTP error, status: ${response.status}`;
        try {
          const errorData = (await response.json()) as { message?: string };
          if (errorData?.message) {
            errorMessage += `\n${errorData.message}`;
          }
        } catch (error) {
          console.error("Error parsing error response:", error);
        }
        throw new Error(errorMessage);
      }

      const data = (await response.json()) as APIResponse;
      const botMessage: FullMessage = {
        role: "assistant",
        content: data.content,
      };
      if (data.sources) {
        botMessage.sources = data.sources;
      }

      setChatHistory((prev) => [...prev, botMessage]);

      if (data.collection_name && data.user_facing_collection_name) {
        setCollection({
          name: data.collection_name,
          user_facing_name: data.user_facing_collection_name,
        });
      }
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
            {chat.sources && (
              <ReactMarkdown className="prose prose-pink prose-invert mt-4">
                {`#### Sources:\n- ${chat.sources.join("\n- ")}`}
              </ReactMarkdown>
            )}
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
          onKeyDown={(e) => e.key === "Enter" && !isLoading && sendMessage()}
        />
        <button
          className={`ml-2 rounded-full ${isLoading ? "bg-neutral-500" : "bg-pink-700"} px-8 py-3 font-bold text-white transition hover:${isLoading ? "bg-neutral-500" : "bg-pink-800"}`}
          onClick={sendMessage}
          disabled={isLoading}
        >
          Send
        </button>
      </div>
      <form onSubmit={handleSubmit} encType="multipart/form-data">
        <input type="file" name="files" multiple />
        <button type="submit">Upload</button>
      </form>
    </div>
  );
};
// ➤

export default ChatInterface;
