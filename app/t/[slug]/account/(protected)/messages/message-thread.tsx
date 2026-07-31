"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { getMyConversationAction } from "@/app/_actions/get-my-conversation";
import { sendMessageAction } from "@/app/_actions/send-message";
import { POLL_INTERVAL_MS } from "@/lib/realtime";
import { Button } from "@/app/_components/ui/button";
import { Textarea } from "@/app/_components/ui/textarea";

type Message = {
  id: string;
  senderType: "CUSTOMER" | "STAFF";
  body: string;
  createdAt: string;
};

export function MessageThread({ initialMessages }: { initialMessages: Message[] }) {
  const t = useTranslations("account.messages");
  const [body, setBody] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages } = useQuery({
    queryKey: ["my-conversation"],
    queryFn: async () => {
      const result = await getMyConversationAction({});
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

  const send = useAction(sendMessageAction, {
    onSuccess: () => setBody(""),
    onError: ({ error }) => toast.error(error.serverError ?? t("sendError")),
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-5 md:p-8">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.senderType === "CUSTOMER" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-xl px-4 py-2 text-sm ${
                  message.senderType === "CUSTOMER"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                <p>{message.body}</p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <form
        className="flex items-end gap-2 border-t bg-background p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!body.trim()) return;
          send.execute({ body });
        }}
      >
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("placeholder")}
          className="min-h-10"
          rows={1}
        />
        <Button type="submit" disabled={send.isPending || !body.trim()}>
          {send.isPending ? t("sending") : t("send")}
        </Button>
      </form>
    </div>
  );
}
