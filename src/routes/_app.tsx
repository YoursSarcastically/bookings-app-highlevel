import { createFileRoute } from "@tanstack/react-router";
import { StoreProvider } from "@/lib/store";
import Shell from "@/components/app/Shell";

// Pathless layout: every front-desk page shares the store and the chrome (sidebar, top bar, ⌘K, PIN).
// Rendered on the client only: the state comes from the API and the signed-in person from this browser.
export const Route = createFileRoute("/_app")({
  ssr: false,
  component: AppLayout,
});

function AppLayout() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
