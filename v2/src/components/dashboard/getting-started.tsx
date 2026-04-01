"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Database, BookOpen, MessageSquare, Hash, KeyRound, Warehouse, BarChart2, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Step {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  done: boolean;
  href: string;
  actionLabel: string;
}

interface GettingStartedProps {
  hasApiKeys: boolean;
  hasOpenAiKey: boolean;
  hasProject: boolean;
  hasEmbeddings: boolean;
  hasConversation: boolean;
  slackConnected: boolean;
  warehouseConnected: boolean;
  metabaseConnected: boolean;
}

export function GettingStarted({
  hasApiKeys,
  hasOpenAiKey,
  hasProject,
  hasEmbeddings,
  hasConversation,
  slackConnected,
  warehouseConnected,
  metabaseConnected,
}: GettingStartedProps) {
  const essentialSteps: Step[] = [
    {
      id: "api-keys",
      label: "Add your API keys",
      description: "Add an OpenAI key (required for embeddings) plus any LLM provider key.",
      icon: KeyRound,
      done: hasApiKeys && hasOpenAiKey,
      href: "/dashboard/settings/llm",
      actionLabel: "Configure",
    },
    {
      id: "project",
      label: "Connect a dbt project",
      description: "Link a dbt Cloud workspace or a GitHub repo to import your models.",
      icon: Database,
      done: hasProject,
      href: "/dashboard/projects",
      actionLabel: "Add project",
    },
    {
      id: "embeddings",
      label: "Build your knowledge base",
      description: "Select models to embed so the AI can understand your data.",
      icon: BookOpen,
      done: hasEmbeddings,
      href: "/dashboard/knowledge-base",
      actionLabel: "Go to knowledge base",
    },
    {
      id: "chat",
      label: "Ask your first question",
      description: "Chat in plain English — Ragstar finds the right models and writes SQL.",
      icon: MessageSquare,
      done: hasConversation,
      href: "/dashboard/chat",
      actionLabel: "Start chatting",
    },
  ];

  const optionalSteps: Step[] = [
    {
      id: "slack",
      label: "Connect Slack",
      description: "Let your team ask data questions by DMing or @mentioning the bot.",
      icon: Hash,
      done: slackConnected,
      href: "/dashboard/settings/integrations",
      actionLabel: "Connect",
    },
    {
      id: "warehouse",
      label: "Connect a data warehouse",
      description: "Run AI-generated queries directly against your warehouse.",
      icon: Warehouse,
      done: warehouseConnected,
      href: "/dashboard/settings/integrations",
      actionLabel: "Connect",
    },
    {
      id: "metabase",
      label: "Connect Metabase",
      description: "Surface relevant Metabase dashboards alongside query answers.",
      icon: BarChart2,
      done: metabaseConnected,
      href: "/dashboard/settings/integrations",
      actionLabel: "Connect",
    },
  ];

  const essentialDone = essentialSteps.every((s) => s.done);
  const optionalDone = optionalSteps.every((s) => s.done);
  const [essentialExpanded, setEssentialExpanded] = useState(false);
  const [optionalExpanded, setOptionalExpanded] = useState(true);

  if (essentialDone && optionalDone) return null;

  const nextEssentialStep = essentialSteps.find((s) => !s.done);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Getting started</CardTitle>
        <CardDescription>
          {essentialDone
            ? "Core setup complete — optionally connect more integrations."
            : `${essentialSteps.filter((s) => s.done).length} of ${essentialSteps.length} essential steps complete`}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-2 space-y-6">
        {/* Essential steps */}
        <div>
          {essentialDone ? (
            <button
              onClick={() => setEssentialExpanded((v) => !v)}
              className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                Essential — complete
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              </span>
              {essentialExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          ) : (
            <button
              onClick={() => {}}
              className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground cursor-default mb-4"
            >
              <span>Essential</span>
            </button>
          )}

          {(!essentialDone || essentialExpanded) && (
            <div className={cn("divide-y", essentialDone && "mt-4")}>
              {essentialSteps.map((step) => {
                const isNext = step.id === nextEssentialStep?.id;
                return <StepRow key={step.id} step={step} isNext={isNext} />;
              })}
            </div>
          )}
        </div>

        {/* Optional steps */}
        {!optionalDone && (
          <div>
            <button
              onClick={() => setOptionalExpanded((v) => !v)}
              className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors cursor-pointer mb-4"
            >
              <span>Optional</span>
              {optionalExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {optionalExpanded && (
              <div className="divide-y">
                {optionalSteps.map((step) => (
                  <StepRow key={step.id} step={step} isNext={false} />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StepRow({ step, isNext }: { step: Step; isNext: boolean }) {
  const Icon = step.icon;
  return (
    <div
      className={cn(
        "flex items-center gap-3 py-2.5 first:pt-0 last:pb-0",
        step.done && "opacity-40"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          step.done ? "text-muted-foreground" : isNext ? "text-primary" : "text-muted-foreground"
        )}
      />
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium leading-none",
            step.done && "line-through text-muted-foreground"
          )}
        >
          {step.label}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
      </div>
      {step.done ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
      ) : (
        <Button asChild size="sm" variant={isNext ? "default" : "outline"} className="shrink-0 h-7 text-xs">
          <Link href={step.href}>
            {step.actionLabel}
            <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      )}
    </div>
  );
}
