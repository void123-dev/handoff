import { createFileRoute } from "@tanstack/react-router";
import { corsOptions, handleVenues } from "@/lib/api-handler.server";

export const Route = createFileRoute("/api/venues")({
  server: {
    handlers: {
      GET: async () => handleVenues(),
      OPTIONS: async () => corsOptions(),
    },
  },
});
