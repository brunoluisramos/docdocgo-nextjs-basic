"use client";

interface TitlePageProps {
  apiUrl: string;
  setApiUrl: (url: string) => void;
  startChat: () => void;
}

const TitlePage = ({ apiUrl, setApiUrl, startChat }: TitlePageProps) => {
  return (
    <div className="max-w-2xl text-center">
      <h1 className="mb-12 text-4xl font-bold text-slate-300 sm:text-5xl">
        Doc<span className="text-[hsl(280,100%,70%)]">Doc</span>Go Test
        Interface
      </h1>
      <div className="w-full">
        <div className="mb-2 text-left text-sm font-semibold text-slate-300">
          Your Flask API URL
        </div>
        <input
          type="text"
          className="mb-4 h-12 w-full rounded-full px-4 py-2 text-black"
          value={apiUrl}
          onChange={(e) => setApiUrl(e.target.value.trim())}
        />
        <button
          className="w-full rounded-full bg-[hsl(280,100%,70%)] px-10 py-3 font-semibold text-white transition hover:bg-[hsl(280,90%,60%)]"
          onClick={startChat}
        >
          Start Chat
        </button>
      </div>
    </div>
  );
};

export default TitlePage;
