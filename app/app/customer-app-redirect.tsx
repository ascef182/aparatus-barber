"use client";

import { useEffect } from "react";
import { getLastShopSlug } from "@/lib/customer-app-storage";
import { getTenantUrl } from "@/lib/tenant-host";

/**
 * Atalho pra quem já escolheu um negócio antes (wrapper TWA/WKWebView
 * aponta pra /app) — pula direto pro subdomínio dele em vez de mostrar a
 * home de novo. Client-only (localStorage); a home renderizada pelo
 * servidor continua por baixo até isso resolver, sem tela de loading.
 */
export function CustomerAppRedirect() {
  useEffect(() => {
    const slug = getLastShopSlug();
    if (slug) window.location.replace(getTenantUrl(slug));
  }, []);

  return null;
}
