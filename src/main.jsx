import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
// React Query Provider
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// MSW: start only when explicitly enabled
if (import.meta.env.DEV && import.meta.env.VITE_USE_MSW === 'true') {
  const { worker } = await import("./mocks/browser");
  worker.start({ onUnhandledRequest: "bypass" });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
