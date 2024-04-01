// components/ChatInterface.tsx
import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Message, FullMessage } from "~/types";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

interface ChatInterfaceProps {
  apiUrl: string;
  apiKey: string;
  openaiApiKey?: string;
}

interface RequestData {
  message: string;
  api_key: string;
  chat_history: Message[];
  openai_api_key?: string;
  collection_name?: string;
  access_codes_cache?: Record<string, string>;
}

const InstructionType = {
  INSTRUCT_SHOW_UPLOADER: "INSTRUCT_SHOW_UPLOADER",
  INSTRUCT_CACHE_ACCESS_CODE: "INSTRUCT_CACHE_ACCESS_CODE",
} as const;

interface Instruction {
  type: (typeof InstructionType)[keyof typeof InstructionType];
  user_id: string | null;
  access_code: string | null;
}

interface APIResponse {
  content: string;
  collection_name: string | null;
  user_facing_collection_name: string | null;
  sources: string[] | null;
  instruction: Instruction | null;
}

interface CollectionInfo {
  name: string;
  user_facing_name: string;
}

type UserId = string | null;

function getChatHistoryForAPI(fullMessages: FullMessage[]): Message[] {
  return fullMessages.map(({ role, content }) => ({ role, content }));
}

const PRIVATE_COLLECTION_USER_ID_LENGTH = 6; // same as in the Python code
function getUserId(openai_api_key: string | undefined): UserId {
  return openai_api_key?.slice(-PRIVATE_COLLECTION_USER_ID_LENGTH) ?? null;
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
  const uploaderRef = useRef<HTMLInputElement | null>(null);
  const accessCodesRef = useRef<Record<string, Record<string, string>>>({});
  // NOTE: keys are `${collection_name} ${user_id}, values are access_code

  function getAccessCode(collectionName: string, userId: UserId) {
    const collectionNameToCode = accessCodesRef.current[userId ?? ""] ?? {};
    return collectionNameToCode[collectionName];
  }
  function setAccessCode(
    collectionName: string,
    userId: UserId,
    accessCode: string,
  ) {
    console.log("Caching access code:", collectionName, userId, accessCode);
    const collectionNameToCode = accessCodesRef.current[userId ?? ""] 
    if (collectionNameToCode) {
      collectionNameToCode[collectionName] = accessCode;
    } else {
      accessCodesRef.current[userId ?? ""] = { [collectionName]: accessCode };
    }
  }

  const userId = getUserId(openaiApiKey);

  useEffect(() => {
    lastChatRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, error]);

  async function handleSubmit() {
    const newMessage: FullMessage = { role: "user", content: message };
    setChatHistory((prev) => [...prev, newMessage]);
    setIsLoading(true);
    setError(null);
    setMessage(""); // clear input field

    const requestData: RequestData = {
      message,
      api_key: apiKey,
      openai_api_key: openaiApiKey,
      chat_history: getChatHistoryForAPI(chatHistory),
      collection_name: collection.name,
      access_codes_cache: accessCodesRef.current[userId ?? ""],
    };

    // Check if the user has selected any files. If not, send request to /chat
    const fileCount = uploaderRef.current?.files?.length;
    if (!fileCount) {
      // Send regular chat message, in JSON format
      const payload = JSON.stringify(requestData);
      return await sendRequest(payload, "/chat");
    }

    // Add files to FormData
    const formData = new FormData();
    for (let i = 0; i < fileCount; i++) {
      const file = uploaderRef.current?.files?.[i];
      if (file) formData.append("files", file);
    }

    // Add fields to FormData and send request to /ingest
    for (const [key, value] of Object.entries(requestData)) {
      if (value === undefined) continue;

      // JSON.stringify, even if it's a string. This introduces extra quotes, so
      // we need to json.loads on the Python side even if it's a string. We do this,
      // in particular, because apparently having any of the values as an empty string
      // causes a 422 error on the Python side.
      formData.append(key, JSON.stringify(value));
    }

    await sendRequest(formData, "/ingest");

    // Clear the selected files
    uploaderRef.current!.value = "";
  }

  const sendRequest = async (payload: string | FormData, endPoint: string) => {
    const isJsonPayload = typeof payload === "string";
    console.log("Sending request to", endPoint, "with payload:\n", payload);

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
      console.log("API Response data:", data);

      const botMessage: FullMessage = {
        role: "assistant",
        content: data.content,
      };
      if (data.sources) {
        botMessage.sources = data.sources;
      }
      setChatHistory((prev) => [...prev, botMessage]);

      if (data.instruction) {
        const { type, user_id, access_code } = data.instruction; // from Python response
        if (type === InstructionType.INSTRUCT_CACHE_ACCESS_CODE) {
          // Cache the access code for this collection and user
          setAccessCode(data.collection_name!, user_id, access_code!);
        }
        // The returned user_id should match userId (both constructed from openaiApiKey)
        if (user_id !== userId)
          setError(`User ID mismatch: ${user_id} !== ${userId}`);
      }

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
      <div className="chatBox scrollbar-thumb-rounded-full scrollbar scrollbar-track-transparent scrollbar-thumb-slate-700 flex h-full w-full flex-col overflow-y-auto overflow-x-hidden rounded-lg px-4 ">
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
          onKeyDown={(e) => e.key === "Enter" && !isLoading && handleSubmit()}
        />
        <button
          className={`ml-2 rounded-full ${isLoading ? "bg-neutral-500" : "bg-pink-700"} px-8 py-3 font-bold text-white transition ${isLoading ? "hover:bg-neutral-500" : "hover:bg-pink-800"}`}
          // NOTE: Factoring out "hover:" doesn't work (Tailwinddoesn't detect class name?)
          onClick={handleSubmit}
          disabled={isLoading}
        >
          Send
        </button>
      </div>

      <div className="flex w-full">
        <Label htmlFor="uploader" hidden>
          Upload your documents
        </Label>
        <Input
          id="uploader"
          type="file"
          name="files"
          className="w-auto cursor-pointer"
          multiple
          disabled={isLoading}
          ref={uploaderRef}
        />
      </div>
    </div>
  );
};
// ➤

export default ChatInterface;
