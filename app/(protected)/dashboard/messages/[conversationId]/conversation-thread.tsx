"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { getStaffConversationAction } from "@/app/_actions/get-staff-conversation";
import { replyToMessageAction } from "@/app/_actions/reply-to-message";
import { POLL_INTERVAL_MS } from "@/lib/realtime";
import { Button } from "@/app/_components/ui/button";
import { Textarea } from "@/app/_components/ui/textarea";

type Message = {
  id: string;
  senderType: "CUSTOMER" | "STAFF";
  body: string;
  createdAt: string;
};

export function ConversationThread({
  conversationId,
  canReply,
  initialMessages,
}: {
  conversationId: string;
  canReply: boolean;
  initialMessages: Message[];
}) {
  const t = useTranslations("dashboard.messages");
  const [body, setBody] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages } = useQuery({
    queryKey: ["staff-conversation", conversationId],
    queryFn: async () => {
      const result = await getStaffConversationAction({ conversationId });
      if (!result?.data) throw new Error("failed to load conversation");
      return (result.data.messages ?? []).map((message) => ({
        id: message.id,
        senderType: message.senderType,
        body: message.body,
        createdAt: message.createdAt instanceof Date ? message.createdAt.toISOString() : message.createdAt,
      }));
    },
    initialData: initialMessages,
    refetchInterval: POLL_INTERVAL_MS.messages,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const reply = useAction(replyToMessageAction, {
    onSuccess: () => setBody(""),
    onError: ({ error }) => toast.error(error.serverError ?? t("replyError")),
  });

  return (
    <div className="flex h-[70vh] flex-col rounded-xl border bg-card">
      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.senderType === "STAFF" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[75%] rounded-xl px-4 py-2 text-sm ${
                message.senderType === "STAFF" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              }`}
            >
              <p>{message.body}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {canReply && (
        <form
          className="flex items-end gap-2 border-t p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!body.trim()) return;
            reply.execute({ conversationId, body });
          }}
        >
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("replyPlaceholder")}
            className="min-h-10"
            rows={1}
          />
          <Button type="submit" disabled={reply.isPending || !body.trim()}>
            {reply.isPending ? t("replying") : t("reply")}
          </Button>
        </form>
      )}
    </div>
  );
}
