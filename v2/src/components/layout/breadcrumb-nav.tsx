"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const SEGMENT_LABELS: Record<string, string | null> = {
  dashboard: "Dashboard",
  projects: "Projects",
  "knowledge-base": "Knowledge Base",
  models: null, // URL artifact — skip
  conversations: "Conversations",
  settings: "Settings",
  llm: "LLM Providers",
  integrations: "Integrations",
  developer: "Developer",
  chat: "New Chat",
  onboarding: "Onboarding",
};

interface BreadcrumbNavProps {
  /** Label for the final (current) segment — overrides auto-derived label for dynamic routes */
  currentLabel?: string;
}

export function BreadcrumbNav({ currentLabel }: BreadcrumbNavProps) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const crumbs: { label: string; href: string }[] = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const knownLabel = SEGMENT_LABELS[seg];
    if (knownLabel === null) continue; // skip URL-only segments like "models"

    const href = "/" + segments.slice(0, i + 1).join("/");
    // For unknown segments (IDs) use currentLabel for the last one, else the segment itself
    const isLast = i === segments.length - 1 || segments.slice(i + 1).every((s) => SEGMENT_LABELS[s] === null || !(s in SEGMENT_LABELS));
    const label = knownLabel ?? (isLast && currentLabel ? currentLabel : seg);
    crumbs.push({ label, href });
  }

  // Replace the last crumb's label with currentLabel if it was a dynamic segment
  if (currentLabel && crumbs.length > 0) {
    const lastSeg = segments[segments.length - 1];
    if (!(lastSeg in SEGMENT_LABELS) || SEGMENT_LABELS[lastSeg] === null) {
      crumbs[crumbs.length - 1] = { ...crumbs[crumbs.length - 1], label: currentLabel };
    }
  }

  if (crumbs.length <= 1) {
    // Single crumb = just the page title, no nav needed
    return <span className="text-sm font-medium">{crumbs[0]?.label ?? currentLabel}</span>;
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <React.Fragment key={crumb.href}>
              {i > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
