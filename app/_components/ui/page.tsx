export const PageContainer = ({ children }: { children: React.ReactNode }) => {
  return <div className="space-y-8 p-5 md:p-8">{children}</div>;
};

export const PageHeader = ({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) => {
  return (
    <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow && <p className="text-sm font-medium text-primary">{eyebrow}</p>}
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-2 max-w-xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
};

export const PageSectionTitle = ({ children }: { children: string }) => {
  return (
    <h2 className="text-foreground text-xs font-semibold uppercase">
      {children}
    </h2>
  );
};

export const PageSection = ({ children }: { children: React.ReactNode }) => {
  return <div className="space-y-3">{children}</div>;
};

export const PageSectionScroller = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <div className="flex gap-4 overflow-x-auto [&::-webkit-scrollbar]:hidden">
      {children}
    </div>
  );
};
