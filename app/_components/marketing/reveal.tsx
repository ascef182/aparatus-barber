"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Fade + slide sutil ao entrar na tela (uma vez só). Puramente decorativo —
 * não depende de hover (funciona igual em touch) e respeita
 * prefers-reduced-motion, mostrando o conteúdo direto sem animação.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
