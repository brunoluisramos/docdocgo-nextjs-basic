"use client";
import { env } from "~/env";

import { useState } from "react";
import TitlePage from "../components/TitlePage";
import ChatInterface from "../components/ChatInterface";

export default function HomePage() {
  const [apiUrl, setApiUrl] = useState(env.NEXT_PUBLIC_DEFAULT_API_URL);
  const [apiKey, setApiKey] = useState(env.NEXT_PUBLIC_DOCDOCGO_API_KEY);
  const [openaiApiKey, setOpenaiApiKey] = useState<string>();

  const [isChatStarted, setIsChatStarted] = useState(false);

  // Function to start the chat, passed down to TitlePage
  const startChat = () => {
    setIsChatStarted(true);
  };

  return (
    <main className="flex h-screen flex-col items-center justify-center bg-slate-900 p-4 leading-relaxed text-slate-400 antialiased selection:bg-teal-300 selection:text-teal-900 md:p-8 ">
      {!isChatStarted ? (
        <TitlePage
          startChat={startChat}
          apiUrl={apiUrl}
          setApiUrl={setApiUrl}
          apiKey={apiKey}
          setApiKey={setApiKey}
          openaiApiKey={openaiApiKey}
          setOpenaiApiKey={setOpenaiApiKey}
        />
      ) : (
        <ChatInterface
          apiUrl={apiUrl}
          apiKey={apiKey}
          openaiApiKey={openaiApiKey}
        />
      )}
    </main>
  );
}
