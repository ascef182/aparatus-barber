"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAction } from "next-safe-action/hooks";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { getMyConversationAction } from "@/app/_actions/get-my-conversation";
import { sendMessageAction } from "@/app/_actions/send-message";
import { POLL_INTERVAL_MS } from "@/lib/realtime";
import { Button } from "@/app/_components/ui/button";
import { Textarea } from "@/app/_components/ui/textarea";
import { ChatThread, type ChatMessage } from "@/app/_components/chat/chat-thread";

type ThreadData = {
  messages: ChatMessage[];
  lastStaffReadAt: string | null;
};

function toChatMessage(message: { id: string; senderType: "CUSTOMER" | "STAFF"; body: string; createdAt: string | Date }): ChatMessage {
  return {
    id: message.id,
    body: message.body,
    createdAt: message.createdAt instanceof Date ? message.createdAt.toISOString() : message.createdAt,
    fromSelf: message.senderType === "CUSTOMER",
  };
}

export function MessageThread({
  organizationName,
  initialMessages,
  initialLastStaffReadAt,
}: {
  organizationName: string;
  initialMessages: { id: string; senderType: "CUSTOMER" | "STAFF"; body: string; createdAt: string }[];
  initialLastStaffReadAt: string | null;
}) {
  const t = useTranslations("account.messages");
  const locale = useLocale() as "en" | "pt" | "de";
  const [body, setBody] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery<ThreadData>({
    queryKey: ["my-conversation"],
    queryFn: async () => {
      const result = await getMyConversationAction({});
      if (!result?.data) throw new Error("failed to load conversation");
      return {
        messages: (result.data.messages ?? []).map(toChatMessage),
        lastStaffReadAt: result.data.lastStaffReadAt ? new Date(result.data.lastStaffReadAt).toISOString() : null,
      };
    },
    initialData: { messages: initialMessages.map(toChatMessage), lastStaffReadAt: initialLastStaffReadAt },
    refetchInterval: POLL_INTERVAL_MS.messages,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data]);

  const send = useAction(sendMessageAction, {
    onSuccess: () => setBody(""),
    onError: ({ error }) => toast.error(error.serverError ?? t("sendError")),
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-1 overflow-y-auto bg-muted/30 p-5 md:p-8">
        {data.messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ChatThread
            messages={data.messages}
            otherPartyName={organizationName}
            otherPartyReadAt={data.lastStaffReadAt}
            locale={locale}
            labels={{ today: t("today"), yesterday: t("yesterday"), sent: t("sentStatus"), read: t("readStatus") }}
          />
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
