import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { CreditCard, TrendingUp, FileText, Clock, Shield } from "lucide-react";
import type { Metrics } from "@shared/schema";

export function MetricsBar() {
  const { data: metrics } = useQuery<Metrics>({
    queryKey: ["/api/metrics"],
  });

  const metricItems = [
    {
      label: "Credit Usage",
      value: metrics?.creditUsage || 0,
      suffix: "of 1000",
      icon: CreditCard,
    },
    {
      label: "Active Sessions",
      value: metrics?.activeSessions || 0,
      icon: TrendingUp,
    },
    {
      label: "Pages Scraped",
      value: metrics?.pagesScraped || 0,
      icon: FileText,
    },
    {
      label: "Browser Minutes",
      value: metrics?.browserMinutes ? (metrics.browserMinutes / 100).toFixed(2) : "0.00",
      icon: Clock,
    },
    {
      label: "Proxy Data (MB)",
      value: metrics?.proxyDataMB || 0,
      icon: Shield,
    },
  ];

  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {metricItems.map((metric) => (
          <Card key={metric.label} className="p-3 text-center border-0 shadow-none transition-transform duration-200 hover:-translate-y-0.5">
            <div className="flex items-center justify-center mb-2">
              <metric.icon className="w-4 h-4 text-muted-foreground mr-2" />
              <span className="text-xs font-medium text-muted-foreground">
                {metric.label}
              </span>
            </div>
            <div className="text-xl font-semibold tracking-tight text-foreground" data-testid={`metric-${metric.label.toLowerCase().replace(/\s+/g, '-')}`}>
              {metric.value}
            </div>
            {metric.suffix && (
              <div className="text-xs text-muted-foreground">
                {metric.suffix}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
