"use client";

import { useState } from "react";

export function FavoriteButton() {
  const [favorited, setFavorited] = useState(false);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        setFavorited((prev) => !prev);
      }}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background shadow-sm transition-colors hover:border-primary"
    >
      <span
        className={`text-sm leading-none transition-colors ${favorited ? "text-red-500" : "text-muted-foreground"}`}
        aria-hidden="true"
      >
        {favorited ? "♥" : "♡"}
      </span>
    </button>
  );
}
