import * as React from "react";
import { ResponsiveContainer, Tooltip, type TooltipContentProps } from "recharts";
import type { ValueType, NameType, Payload } from "recharts/types/component/DefaultTooltipContent";
import { cn } from "@/lib/utils";

export interface ChartConfig {
  [key: string]: {
    label: string;
    color: string;
  };
}

const ChartContext = React.createContext<ChartConfig | null>(null);

interface ChartContainerProps extends React.ComponentProps<"div"> {
  config: ChartConfig;
}

export function ChartContainer({ config, className, children, ...props }: ChartContainerProps) {
  const style = Object.fromEntries(Object.entries(config).map(([key, value]) => [`--color-${key}`, value.color])) as React.CSSProperties;

  return (
    <ChartContext.Provider value={config}>
      <div data-slot="chart" className={cn("aspect-video w-full", className)} style={style} {...props}>
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

export const ChartTooltip = Tooltip;

type ChartTooltipContentProps = Partial<TooltipContentProps<ValueType, NameType>> & {
  className?: string;
  unitByKey?: Record<string, string>;
};

export function ChartTooltipContent({ active, payload, label, className, unitByKey }: ChartTooltipContentProps) {
  const config = React.useContext(ChartContext);

  if (!active || !payload?.length) return null;

  return (
    <div className={cn("min-w-[10rem] rounded-lg border bg-background px-3 py-2 text-sm shadow-md", className)}>
      <p className="mb-1.5 font-medium">{label}</p>
      <div className="space-y-1">
        {payload.map((item: Payload<ValueType, NameType>) => {
          const key = String(item.dataKey ?? item.name);
          const entry = config?.[key];
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-muted-foreground">{entry?.label ?? key}</span>
              <span className="ml-auto font-medium tabular-nums">
                {typeof item.value === "number" ? item.value.toFixed(1) : item.value}
                {unitByKey?.[key] ?? ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
