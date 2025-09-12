import { useEffect, useState } from "react";
import { Command, CommandDialog, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export function CommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const openHandler = () => setOpen(true);
    window.addEventListener("keydown", keyHandler);
    window.addEventListener("open-command-palette", openHandler as EventListener);
    return () => {
      window.removeEventListener("keydown", keyHandler);
      window.removeEventListener("open-command-palette", openHandler as EventListener);
    };
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command>
        <CommandInput placeholder="Search commands, pages, or data…" />
        <CommandList>
          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => (window.location.href = "/")}>Overview</CommandItem>
            <CommandItem onSelect={() => (window.location.href = "/tasks")}>Tasks</CommandItem>
            <CommandItem onSelect={() => (window.location.href = "/data-portal")}>Data Portal</CommandItem>
            <CommandItem onSelect={() => (window.location.href = "/agents")}>Agents</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}





