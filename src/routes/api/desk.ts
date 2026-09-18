import { createFileRoute } from "@tanstack/react-router";
import { corsOptions, handleDesk } from "@/lib/api-handler.server";

export const Route = createFileRoute("/api/desk")({
  server: {
    handlers: {
      GET: async ({ request }) => handleDesk(request),
      OPTIONS: async () => corsOptions(),
    },
  },
});
