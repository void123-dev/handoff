import { createFileRoute } from "@tanstack/react-router";
import { corsOptions, handleExport } from "@/lib/api-handler.server";

export const Route = createFileRoute("/api/export")({
  server: {
    handlers: {
      GET: async ({ request }) => handleExport(request),
      OPTIONS: async () => corsOptions(),
    },
  },
});
