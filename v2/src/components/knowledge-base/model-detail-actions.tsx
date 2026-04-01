"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sparkles, DatabaseZap, RefreshCw, Loader2 } from "lucide-react";

interface ModelDetailActionsProps {
  modelId: string;
  isEmbedded: boolean;
}

export function ModelDetailActions({ modelId, isEmbedded }: ModelDetailActionsProps) {
  const router = useRouter();
  const [interpreting, setInterpreting] = useState(false);
  const [embedding, setEmbedding] = useState(false);

  async function handleInterpret() {
    setInterpreting(true);
    try {
      const res = await fetch(`/api/models/${modelId}/interpret`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      // 202: job started in background
      toast.success("Interpretation started — refresh in a moment to see the updated description and columns.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Interpretation failed");
    } finally {
      setInterpreting(false);
    }
  }

  async function handleEmbed() {
    setEmbedding(true);
    try {
      const res = await fetch(`/api/models/${modelId}/embedding`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      // 202: job started in background
      toast.success("Embedding started — the model will appear in your knowledge base shortly.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Embedding failed");
    } finally {
      setEmbedding(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleInterpret}
        disabled={interpreting}
      >
        {interpreting ? (
          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4 mr-1.5" />
        )}
        {interpreting ? "Interpreting…" : "Interpret with AI"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleEmbed}
        disabled={embedding}
      >
        {embedding ? (
          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
        ) : isEmbedded ? (
          <RefreshCw className="h-4 w-4 mr-1.5" />
        ) : (
          <DatabaseZap className="h-4 w-4 mr-1.5" />
        )}
        {embedding ? "Embedding…" : isEmbedded ? "Re-embed" : "Add to Knowledge Base"}
      </Button>
    </div>
  );
}
