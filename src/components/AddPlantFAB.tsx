import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useIsAuthenticated } from "@/hooks/useIsAuthenticated";

export function AddPlantFAB() {
  const { isAuthenticated } = useIsAuthenticated();
  if (!isAuthenticated) return null;
  return (
    <Link
      to="/plants/new"
      aria-label="Add plant"
      className="fixed bottom-8 right-8 z-50 inline-flex items-center justify-center gap-2 rounded-full bg-[var(--leaf)] text-primary-foreground shadow-lg hover:bg-[var(--leaf)]/90 transition-colors size-14 p-0 md:size-auto md:h-12 md:px-5"
    >
      <Plus className="size-5 shrink-0" />
      <span className="hidden md:inline text-sm font-semibold">Add plant</span>
    </Link>
  );
}
