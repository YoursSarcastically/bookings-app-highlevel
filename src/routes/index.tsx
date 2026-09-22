import { createFileRoute, redirect } from "@tanstack/react-router";

// The app lives under the _app layout; the front desk is the home page.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/frontdesk" });
  },
});
