import { ReactNode } from "react";

interface PageProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function Page({ title, subtitle, actions, children }: PageProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-6">
      {(title || subtitle || actions) && (
        <div className="flex items-end justify-between pt-[72px] pb-6">
          <div>
            {title && <h1 className="text-3xl font-bold text-foreground tracking-tight">{title}</h1>}
            {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="pb-[64px]">
        {children}
      </div>
    </div>
  );
}


