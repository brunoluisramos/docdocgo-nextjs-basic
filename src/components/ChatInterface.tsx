// components/ChatInterface.tsx
import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Message, FullMessage, BotSettings } from "~/types";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { env } from "~/env";

interface ChatInterfaceProps {
  apiUrl: string;
  apiKey: string;
  openaiApiKey?: string;
}

interface RequestData {
  message: string;
  api_key: string;
  chat_history: Message[];
  collection_name: string;
  openai_api_key?: string;
  access_codes_cache?: Record<string, string>;
  scheduled_queries_str?: string;
  bot_settings?: BotSettings;
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
  instructions: Instruction[] | null;
  scheduled_queries_str: string | null;
}

interface CollectionInfo {
  name: string;
  user_facing_name: string;
}

type UserId = string | null;

function getChatHistoryForAPI(fullMessages: FullMessage[]): Message[] {
  // Convert "system" role to "user" role for the API, remove sources
  return fullMessages.map(({ role, content }) => ({
    role: role === "system" ? "user" : role,
    content,
  }));
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

  const [messageText, setMessage] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<FullMessage[]>([]);
  const [scheduledQueriesStr, setScheduledQueriesStr] = useState<string | null>(
    null,
  );

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [collection, setCollection] = useState<CollectionInfo>({
    name: "",
    user_facing_name: "default",
  });

  const [llmModelName, setLlmModelName] = useState<string>(env.NEXT_PUBLIC_DEFAULT_MODEL_NAME)
  const [llmTemperature, setLlmTemperature] = useState<number>(env.NEXT_PUBLIC_DEFAULT_TEMPERATURE)

  const lastChatRef = useRef<HTMLDivElement | null>(null);
  const uploaderRef = useRef<HTMLInputElement | null>(null);
  const accessCodesRef = useRef<Record<string, Record<string, string>>>({});
  // userId: { collectionName: accessCode }

  const isBusy = isLoading || !!scheduledQueriesStr;

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
    const collectionNameToCode = accessCodesRef.current[userId ?? ""];
    if (collectionNameToCode) {
      collectionNameToCode[collectionName] = accessCode;
    } else {
      accessCodesRef.current[userId ?? ""] = { [collectionName]: accessCode };
    }
  }

  const userId = getUserId(openaiApiKey);

  // Run after every render to check for scheduled queries
  useEffect(() => {
    if (!scheduledQueriesStr || isLoading) return;
    async function runScheduledQueries() {
      await handleSubmit("AUTO-INSTRUCTION: Run scheduled query.");
    }
    void runScheduledQueries();
  });

  useEffect(() => {
    lastChatRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, error]);

  async function handleSubmit(systemMessageText: string | null = null) {
    const newMessage: FullMessage = { role: "user", content: messageText };
    if (systemMessageText) {
      // If there is a system message, add it before/in place of the user message
      const systemMessage: FullMessage = {
        role: "system",
        content: systemMessageText,
      };
      if (messageText) setChatHistory((x) => [...x, systemMessage, newMessage]);
      else setChatHistory((x) => [...x, systemMessage]); // normally should happen
    } else {
      // Otherwise, just add the user message
      setChatHistory((x) => [...x, newMessage]);
    }
    
    setIsLoading(true);
    setError(null);
    setMessage(""); // clear input field

    const requestData: RequestData = {
      message: messageText,
      api_key: apiKey,
      openai_api_key: openaiApiKey,
      chat_history: getChatHistoryForAPI(chatHistory),
      collection_name: collection.name,
      access_codes_cache: accessCodesRef.current[userId ?? ""],
      scheduled_queries_str: scheduledQueriesStr ?? undefined,
      bot_settings: {
        llm_model_name: llmModelName,
        temperature: llmTemperature,
      },
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

      for (const instruction of data.instructions ?? []) {
        const { type, user_id, access_code } = instruction;

        if (type === InstructionType.INSTRUCT_CACHE_ACCESS_CODE) {
          // Cache the access code for this collection and user
          // (collection_name and access_code are non-null for this instruction type)
          setAccessCode(data.collection_name!, user_id, access_code!);

          // The returned user_id should match userId (both constructed from openaiApiKey)
          if (user_id !== userId)
            setError(`User ID mismatch: ${user_id} !== ${userId}`);
        }
      }

      if (data.collection_name && data.user_facing_collection_name) {
        setCollection({
          name: data.collection_name,
          user_facing_name: data.user_facing_collection_name,
        });
      }

      setScheduledQueriesStr(data.scheduled_queries_str);
    } catch (error) {
      console.error("Error getting response:", error);
      const msg = error instanceof Error ? error.message : String(error);
      setError(`Error getting response:\n\`\`\`\n${msg}\n\`\`\``);
    }
    setIsLoading(false); // so it can send another message
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
              {chat.role === "user"
                ? "You:"
                : chat.role === "assistant"
                  ? "DDG:"
                  : "System:"}
            </div>
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
            isBusy
              ? "Awaiting response..."
              : `Collection: ${collection.user_facing_name}`
          }
          className="w-full rounded-lg bg-slate-800 px-4 py-2"
          value={messageText}
          onChange={(e) => setMessage(e.target.value)}
          disabled={isBusy}
          onKeyDown={(e) => e.key === "Enter" && !isBusy && handleSubmit()}
        />
        <button
          className={`ml-2 rounded-full ${isBusy ? "bg-neutral-500" : "bg-pink-700"} px-8 py-3 font-bold text-white transition ${isBusy ? "hover:bg-neutral-500" : "hover:bg-pink-800"}`}
          // NOTE: Factoring out "hover:" doesn't work (Tailwinddoesn't detect class name?)
          onClick={() => handleSubmit()}
          disabled={isBusy}
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
          disabled={isBusy}
          ref={uploaderRef}
        />
      </div>
    </div>
  );
};
// ➤

export default ChatInterface;
