import { createFileRoute } from "@tanstack/react-router";
import { corsOptions, handleHandoff } from "@/lib/api-handler.server";

export const Route = createFileRoute("/api/handoff")({
  server: {
    handlers: {
      GET: async ({ request }) => handleHandoff(request),
      OPTIONS: async () => corsOptions(),
    },
  },
});
