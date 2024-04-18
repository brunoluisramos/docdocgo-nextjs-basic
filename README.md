# Next.js Frontend for DocDocGo FastAPI Backend

This frontend can serve as a reference implementation for how to interact with the DocDocGo API. It can also be used to test the API.

## Getting Started

### 1. Start the backend server

See the instructions in the [backend README](https://github.com/reasonmethis/docdocgo-core/?tab=readme-ov-file#installation) to start the backend server.

### 2. Clone the repository and install dependencies

Use your favorite way to clone the repository and cd into the directory. Then install the dependencies:

```bash
npm install
```

### 3. Configure the environment variables

Copy the `.env.example` file to `.env` and fill in the values as described in the file.

### 4. Start the development server

```bash
npm run dev
```

### 5. Open the app

Open [http://localhost:3000](http://localhost:3000) with your browser. Double check that the app shows the correct backend URL on the home page. If not, then you can manually change the URL in the input field.

Optionally fill in the other fields and click the "Start Chat" button.

To test the connection to the backend without sending a request to the LLM, you can enter the command:

```bash
/help
```
