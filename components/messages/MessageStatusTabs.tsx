"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";

const STATUSES = ["all", "draft", "sent", "acknowledged", "resolved"] as const;

export function MessageStatusTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentStatus = searchParams.get("status") || "all";

  function handleFilter(status: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (status === "all") {
      params.delete("status");
    } else {
      params.set("status", status);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
      {STATUSES.map((status) => (
        <Button
          key={status}
          variant={currentStatus === status ? "default" : "outline"}
          onClick={() => handleFilter(status)}
          className="capitalize"
        >
          {status}
        </Button>
      ))}
    </div>
  );
}
