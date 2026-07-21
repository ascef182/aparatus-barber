"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const QueryProvider = ({ children }: { children: React.ReactNode }) => {
  // Instanciado dentro do componente (não no module scope): em SSR um
  // client em module scope seria compartilhado entre requests/usuários
  // diferentes no processo do servidor — useState garante um QueryClient
  // por sessão do browser.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10_000,
            retry: 1,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

export default QueryProvider;
