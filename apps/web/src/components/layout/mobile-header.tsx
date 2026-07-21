import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

interface MobileHeaderProps {
  title: ReactNode;
  back?: string;
  actions?: ReactNode;
}

export function MobileHeader({ title, back, actions }: MobileHeaderProps) {
  return (
    <header className="md:hidden sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="flex h-[52px] items-center gap-2 px-4">
        {back && (
          <Link
            to={back}
            className="-ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">戻る</span>
          </Link>
        )}
        <h1 className="flex-1 truncate text-base font-semibold">{title}</h1>
        {actions}
      </div>
    </header>
  );
}
