"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAction } from "next-safe-action/hooks";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { getStaffConversationAction } from "@/app/_actions/get-staff-conversation";
import { replyToMessageAction } from "@/app/_actions/reply-to-message";
import { POLL_INTERVAL_MS } from "@/lib/realtime";
import { Button } from "@/app/_components/ui/button";
import { Textarea } from "@/app/_components/ui/textarea";
import { ChatThread, type ChatMessage } from "@/app/_components/chat/chat-thread";

type ThreadData = {
  messages: ChatMessage[];
  lastCustomerReadAt: string | null;
};

function toChatMessage(message: { id: string; senderType: "CUSTOMER" | "STAFF"; body: string; createdAt: string | Date }): ChatMessage {
  return {
    id: message.id,
    body: message.body,
    createdAt: message.createdAt instanceof Date ? message.createdAt.toISOString() : message.createdAt,
    fromSelf: message.senderType === "STAFF",
  };
}

export function ConversationThread({
  conversationId,
  canReply,
  customerName,
  customerImage,
  initialMessages,
  initialLastCustomerReadAt,
}: {
  conversationId: string;
  canReply: boolean;
  customerName: string;
  customerImage: string | null;
  initialMessages: { id: string; senderType: "CUSTOMER" | "STAFF"; body: string; createdAt: string }[];
  initialLastCustomerReadAt: string | null;
}) {
  const t = useTranslations("dashboard.messages");
  const locale = useLocale() as "en" | "pt" | "de";
  const [body, setBody] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery<ThreadData>({
    queryKey: ["staff-conversation", conversationId],
    queryFn: async () => {
      const result = await getStaffConversationAction({ conversationId });
      if (!result?.data) throw new Error("failed to load conversation");
      return {
        messages: (result.data.messages ?? []).map(toChatMessage),
        lastCustomerReadAt: result.data.lastCustomerReadAt
          ? new Date(result.data.lastCustomerReadAt).toISOString()
          : null,
      };
    },
    initialData: { messages: initialMessages.map(toChatMessage), lastCustomerReadAt: initialLastCustomerReadAt },
    refetchInterval: POLL_INTERVAL_MS.messages,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data]);

  const reply = useAction(replyToMessageAction, {
    onSuccess: () => setBody(""),
    onError: ({ error }) => toast.error(error.serverError ?? t("replyError")),
  });

  return (
    <div className="flex h-[70vh] flex-col rounded-xl border bg-card">
      <div className="flex-1 space-y-1 overflow-y-auto bg-muted/30 p-5">
        <ChatThread
          messages={data.messages}
          otherPartyName={customerName}
          otherPartyImage={customerImage}
          otherPartyReadAt={data.lastCustomerReadAt}
          locale={locale}
          labels={{ today: t("today"), yesterday: t("yesterday"), sent: t("sentStatus"), read: t("readStatus") }}
        />
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
