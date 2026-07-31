"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { claimCouponAction } from "@/app/_actions/claim-coupon";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";

export function ClaimCouponForm() {
  const t = useTranslations("account.coupons");
  const router = useRouter();
  const [code, setCode] = useState("");

  const claim = useAction(claimCouponAction, {
    onSuccess: () => {
      toast.success(t("claimed"));
      setCode("");
      router.refresh();
    },
    onError: ({ error }) => toast.error(error.serverError ?? t("claimError")),
  });

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        claim.execute({ code });
      }}
    >
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder={t("codePlaceholder")}
        required
      />
      <Button type="submit" disabled={claim.isPending}>
        {claim.isPending ? t("claiming") : t("claim")}
      </Button>
    </form>
  );
}
