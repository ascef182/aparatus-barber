import { db } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/tenant-context";

/**
 * Customer.userId aponta pro User do Better Auth, mas não é uma relação do
 * Prisma (User é gerenciado à parte, sem organizationId — ver lib/db.ts) —
 * por isso a foto (User.image, populada por contas Google) precisa desse
 * lookup em separado via client cru, em vez de um include.
 */
async function customerImagesByUserId(userIds: string[]): Promise<Map<string, string | null>> {
  if (userIds.length === 0) return new Map();
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, image: true },
  });
  return new Map(users.map((user) => [user.id, user.image]));
}

export async function findOrCreateConversationForCustomer(customerId: string) {
  const organizationId = requireTenantId();
  const existing = await db.conversation.findUnique({
    where: {
      organizationId_customerId: {
        organizationId,
        customerId,
      },
    },
  });
  if (existing) return existing;
  return db.conversation.create({
    data: {
      organizationId,
      customerId,
    },
  });
}

export async function createCustomerMessage(
  customerId: string,
  senderUserId: string,
  body: string,
) {
  const organizationId = requireTenantId();
  const conversation = await findOrCreateConversationForCustomer(customerId);
  const message = await db.message.create({
    data: {
      organizationId,
      conversationId: conversation.id,
      senderType: "CUSTOMER",
      senderUserId,
      body,
    },
  });
  // Update conversation's lastMessageAt and lastCustomerReadAt
  await db.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: new Date(),
      lastCustomerReadAt: new Date(),
    },
  });
  return message;
}

export async function markConversationReadByCustomer(customerId: string) {
  const organizationId = requireTenantId();
  return db.conversation.update({
    where: {
      organizationId_customerId: {
        organizationId,
        customerId,
      },
    },
    data: {
      lastCustomerReadAt: new Date(),
    },
  });
}

export async function getConversationForCustomer(customerId: string) {
  const organizationId = requireTenantId();
  const conversation = await db.conversation.findUnique({
    where: {
      organizationId_customerId: {
        organizationId,
        customerId,
      },
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (conversation) {
    await markConversationReadByCustomer(customerId);
  }
  return conversation;
}

export async function hasUnreadMessagesForCustomer(
  customerId: string,
): Promise<boolean> {
  const organizationId = requireTenantId();
  const conversation = await db.conversation.findUnique({
    where: {
      organizationId_customerId: {
        organizationId,
        customerId,
      },
    },
  });
  if (!conversation) return false;
  if (!conversation.lastMessageAt) return false;
  if (!conversation.lastCustomerReadAt) return true;
  return conversation.lastMessageAt > conversation.lastCustomerReadAt;
}

export async function listConversationsForStaff() {
  const organizationId = requireTenantId();
  const conversations = await db.conversation.findMany({
    where: { organizationId },
    include: {
      customer: {
        select: { id: true, name: true, email: true, userId: true },
      },
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { lastMessageAt: "desc" },
  });
  const images = await customerImagesByUserId(
    conversations.map((conv) => conv.customer.userId).filter((id): id is string => !!id),
  );
  return conversations.map((conv) => ({
    ...conv,
    customer: { ...conv.customer, image: conv.customer.userId ? (images.get(conv.customer.userId) ?? null) : null },
    lastMessage: conv.messages[0] || null,
    unread:
      conv.lastMessageAt &&
      (!conv.lastStaffReadAt || conv.lastMessageAt > conv.lastStaffReadAt),
  }));
}

export async function getConversationForStaff(conversationId: string) {
  const organizationId = requireTenantId();
  const conversation = await db.conversation.findUnique({
    where: { id_organizationId: { id: conversationId, organizationId } },
    include: {
      customer: {
        select: { id: true, name: true, email: true, userId: true },
      },
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!conversation) return null;
  await db.conversation.update({
    where: { id: conversationId },
    data: {
      lastStaffReadAt: new Date(),
    },
  });
  const image = conversation.customer.userId
    ? ((await customerImagesByUserId([conversation.customer.userId])).get(conversation.customer.userId) ?? null)
    : null;
  return { ...conversation, customer: { ...conversation.customer, image } };
}

export async function createStaffReply(
  conversationId: string,
  senderUserId: string,
  body: string,
) {
  const organizationId = requireTenantId();
  const conversation = await db.conversation.findUnique({
    where: { id_organizationId: { id: conversationId, organizationId } },
  });
  if (!conversation) {
    throw new Error("Conversa não encontrada.");
  }
  const message = await db.message.create({
    data: {
      organizationId,
      conversationId,
      senderType: "STAFF",
      senderUserId,
      body,
    },
  });
  // Update conversation's lastMessageAt
  await db.conversation.update({
    where: { id: conversationId },
    data: {
      lastMessageAt: new Date(),
    },
  });
  return message;
}

export async function countUnreadConversationsForStaff(): Promise<number> {
  const organizationId = requireTenantId();
  const conversations = await db.conversation.findMany({
    where: { organizationId },
    select: { lastMessageAt: true, lastStaffReadAt: true },
  });
  return conversations.filter(
    (conv) =>
      conv.lastMessageAt &&
      (!conv.lastStaffReadAt || conv.lastMessageAt > conv.lastStaffReadAt),
  ).length;
}
