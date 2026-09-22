import { createFileRoute, redirect } from "@tanstack/react-router";

// Old bookmark: the Today section was renamed to Front desk.
export const Route = createFileRoute("/today")({
  beforeLoad: () => {
    throw redirect({ to: "/frontdesk" });
  },
});
