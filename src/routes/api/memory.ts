import { createFileRoute } from "@tanstack/react-router";
import { corsOptions, handleMemory } from "@/lib/api-handler.server";

export const Route = createFileRoute("/api/memory")({
  server: {
    handlers: {
      GET: async ({ request }) => handleMemory(request),
      OPTIONS: async () => corsOptions(),
    },
  },
});
