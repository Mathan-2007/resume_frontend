import React from "react";
import { cn } from "../../lib/utils"


export function Button({ className, variant = "default", ...props }) {
  const variants = {
    default:
      "bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-300",
    outline:
      "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100",
  };

  return (
    <button
      className={cn(
        "rounded-xl px-4 py-2 font-medium transition-all focus:outline-none",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
