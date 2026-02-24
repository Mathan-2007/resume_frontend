import React from "react";
import { cn } from "../../lib/utils"


export function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-white shadow-md p-4 transition-all hover:shadow-lg",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={cn("mb-2 font-semibold text-xl", className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn("text-gray-700", className)} {...props} />;
}

export function CardFooter({ className, ...props }) {
  return <div className={cn("mt-3 text-sm text-gray-500", className)} {...props} />;
}
