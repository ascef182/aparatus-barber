"use client";

import { SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";

export function AppSearchBar({ placeholder, initialQuery }: { placeholder: string; initialQuery?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery ?? "");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    router.push(trimmed ? `/app?q=${encodeURIComponent(trimmed)}` : "/app");
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        className="rounded-full"
      />
      <Button type="submit" size="icon" className="shrink-0 rounded-full">
        <SearchIcon className="size-4" />
        <span className="sr-only">{placeholder}</span>
      </Button>
    </form>
  );
}
