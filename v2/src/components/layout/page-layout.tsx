import { ReactNode } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { BreadcrumbNav } from "@/components/layout/breadcrumb-nav";

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  fill?: boolean;
}

export function PageLayout({ title, subtitle, actions, children, fill }: PageLayoutProps) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4 sm:px-6">
        <SidebarTrigger className="-ml-1" />
        <div className="h-4 w-px shrink-0 bg-border" />
        <div className="min-w-0 truncate"><BreadcrumbNav currentLabel={title} /></div>
      </header>
      <main className={fill ? "flex min-h-0 flex-1 flex-col overflow-hidden p-4 sm:p-8" : "flex-1 overflow-auto bg-background p-4 sm:p-8 lg:px-10"}>
        <div className={fill ? "flex min-h-0 flex-1 flex-col" : "mx-auto w-full max-w-6xl"}>
          <div className="mb-8 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl break-words">{title}</h1>
              {subtitle && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2 sm:pt-1">{actions}</div>}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
