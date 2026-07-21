"use client"

import * as React from "react"
import { useId, useState } from "react"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/app/_components/ui/input"
import { Label } from "@/app/_components/ui/label"

export interface PasswordInputProps extends React.ComponentProps<"input"> {
  label?: string
  hidePasswordLabel?: string
  showPasswordLabel?: string
}

function PasswordInput({
  className,
  label,
  id,
  hidePasswordLabel = "Hide password",
  showPasswordLabel = "Show password",
  ...props
}: PasswordInputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="grid w-full items-center gap-2">
      {label && <Label htmlFor={inputId}>{label}</Label>}
      <div className="relative">
        <Input
          id={inputId}
          type={showPassword ? "text" : "password"}
          className={cn("pe-10", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center text-muted-foreground/80 transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
          aria-label={showPassword ? hidePasswordLabel : showPasswordLabel}
        >
          {showPassword ? (
            <EyeOff className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  )
}

export { PasswordInput }
