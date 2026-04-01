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
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="mr-2 w-px h-6 shrink-0 bg-border" />
        <div className="flex flex-1 items-center justify-between min-w-0">
          <BreadcrumbNav currentLabel={title} />
          {actions && <div className="flex shrink-0 items-center gap-2 ml-4">{actions}</div>}
        </div>
      </header>
      {fill ? (
        <div className="flex-1 overflow-hidden min-h-0 flex flex-col p-2">
          {children}
        </div>
      ) : (
        <div className="flex-1 overflow-auto bg-sidebar p-6">
          {subtitle && (
            <p className="text-sm text-muted-foreground mb-6">{subtitle}</p>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
