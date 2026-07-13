import { prisma } from "@/lib/prisma";

export function listBarbershops(order: "asc" | "desc" = "asc") {
  return prisma.barbershop.findMany({
    orderBy: { name: order },
  });
}

export function listBarbershopsWithServices(name?: string) {
  return prisma.barbershop.findMany({
    where: name?.trim()
      ? { name: { contains: name, mode: "insensitive" } }
      : undefined,
    include: { services: true },
  });
}

export function searchBarbershopsByServiceName(search: string) {
  return prisma.barbershop.findMany({
    where: {
      services: {
        some: { name: { contains: search, mode: "insensitive" } },
      },
    },
    orderBy: { name: "asc" },
  });
}

export function getBarbershopWithServices(id: string) {
  return prisma.barbershop.findUnique({
    where: { id },
    include: { services: true },
  });
}

export function getServiceById(serviceId: string) {
  return prisma.barbershopService.findUnique({
    where: { id: serviceId },
  });
}

export function getServiceWithBarbershop(serviceId: string) {
  return prisma.barbershopService.findUnique({
    where: { id: serviceId },
    include: { barbershop: true },
  });
}
