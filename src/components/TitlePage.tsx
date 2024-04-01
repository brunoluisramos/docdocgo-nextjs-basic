"use client";

interface TitlePageProps {
  apiUrl: string;
  setApiUrl: (url: string) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  openaiApiKey?: string;
  setOpenaiApiKey: (key: string | undefined) => void;
  startChat: () => void;
}

const TitlePage = (props: TitlePageProps) => {
  return (
    <div className="max-w-2xl pb-12 text-center">
      <h1 className="animate-slide-up-fade mb-12 text-4xl font-bold text-slate-300 sm:text-5xl">
        Doc<span className=" text-pink-600">Doc</span>Go Test Interface
      </h1>
      <div className="w-full">
        <label
          htmlFor="apiUrl"
          className="mb-2 block text-left text-sm font-semibold text-slate-300"
        >
          DocDocGo API URL
        </label>
        <input
          id="apiUrl"
          type="text"
          className="mb-6 h-12 w-full rounded-full px-4 py-2 text-black"
          value={props.apiUrl}
          onChange={(e) => props.setApiUrl(e.target.value)}
        />

        <label
          htmlFor="apiKey"
          className="mb-2 block text-left text-sm font-semibold text-slate-300"
        >
          DocDocGo API Key
        </label>
        <input
          id="apiKey"
          type="text"
          className="mb-6 h-12 w-full rounded-full px-4 py-2 text-black"
          value={props.apiKey}
          onChange={(e) => props.setApiKey(e.target.value)}
        />

        <label
          htmlFor="openaiApiKey"
          className="mb-2 block text-left text-sm font-semibold text-slate-300"
        >
          OpenAI API Key (optional)
        </label>
        <input
          id="openaiApiKey"
          type="text"
          className="mb-6 h-12 w-full rounded-full px-4 py-2 text-black"
          value={props.openaiApiKey}
          onChange={(e) => props.setOpenaiApiKey(e.target.value)}
        />

        <button
          className="mt-6 w-full rounded-full  bg-pink-600 px-10 py-3 font-bold text-white transition hover:bg-pink-700"
          onClick={props.startChat}
        >
          Start Chat
        </button>
      </div>
    </div>
  );
};

export default TitlePage;
