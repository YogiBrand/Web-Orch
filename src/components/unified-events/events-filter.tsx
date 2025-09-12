import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { UnifiedEvent, EventFilter } from "./types";
import { 
  Search, 
  X, 
  Calendar as CalendarIcon,
  Filter,
  Bot,
  Globe,
  Mouse,
  Keyboard,
  Navigation,
  Scroll,
  Clock,
  Eye,
  Send,
  AlertCircle,
  CheckCircle2,
  Activity,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

interface EventsFilterProps {
  filter: EventFilter;
  onFilterChange: (filter: EventFilter) => void;
  events: UnifiedEvent[];
  className?: string;
}

const agentTypeOptions = [
  { value: "skyvern", label: "Skyvern", icon: Bot, color: "text-purple-600" },
  { value: "playwright", label: "Playwright", icon: Globe, color: "text-green-600" },
  { value: "browser-use", label: "Browser Use", icon: Mouse, color: "text-blue-600" },
  { value: "selenium", label: "Selenium", icon: Bot, color: "text-orange-600" },
  { value: "puppeteer", label: "Puppeteer", icon: Bot, color: "text-red-600" }
];

const actionTypeOptions = [
  { value: "click", label: "Click", icon: Mouse, color: "text-blue-600" },
  { value: "type", label: "Type", icon: Keyboard, color: "text-green-600" },
  { value: "navigate", label: "Navigate", icon: Navigation, color: "text-purple-600" },
  { value: "scroll", label: "Scroll", icon: Scroll, color: "text-orange-600" },
  { value: "wait", label: "Wait", icon: Clock, color: "text-yellow-600" },
  { value: "extract", label: "Extract", icon: Eye, color: "text-indigo-600" },
  { value: "submit", label: "Submit", icon: Send, color: "text-emerald-600" },
  { value: "error", label: "Error", icon: AlertCircle, color: "text-red-600" },
  { value: "success", label: "Success", icon: CheckCircle2, color: "text-green-600" }
];

const statusOptions = [
  { value: "pending", label: "Pending", icon: Clock, color: "text-yellow-600" },
  { value: "processing", label: "Processing", icon: Loader2, color: "text-blue-600" },
  { value: "completed", label: "Completed", icon: CheckCircle2, color: "text-green-600" },
  { value: "failed", label: "Failed", icon: AlertCircle, color: "text-red-600" }
];

const dateRangePresets = [
  { label: "Last hour", getValue: () => ({ start: subDays(new Date(), 0), end: new Date() }) },
  { label: "Today", getValue: () => ({ start: startOfDay(new Date()), end: endOfDay(new Date()) }) },
  { label: "Last 24h", getValue: () => ({ start: subDays(new Date(), 1), end: new Date() }) },
  { label: "Last 3 days", getValue: () => ({ start: subDays(new Date(), 3), end: new Date() }) },
  { label: "Last week", getValue: () => ({ start: subDays(new Date(), 7), end: new Date() }) }
];

export const EventsFilter: React.FC<EventsFilterProps> = ({
  filter,
  onFilterChange,
  events,
  className
}) => {
  const [localFilter, setLocalFilter] = useState<EventFilter>(filter);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Get statistics from events for display
  const getEventStats = () => {
    const agentStats = agentTypeOptions.map(agent => ({
      ...agent,
      count: events.filter(e => e.agent_type === agent.value).length
    }));

    const actionStats = actionTypeOptions.map(action => ({
      ...action,
      count: events.filter(e => e.action_type === action.value).length
    }));

    const statusStats = statusOptions.map(status => ({
      ...status,
      count: events.filter(e => e.status === status.value).length
    }));

    return { agentStats, actionStats, statusStats };
  };

  const { agentStats, actionStats, statusStats } = getEventStats();

  const updateFilter = (updates: Partial<EventFilter>) => {
    const newFilter = { ...localFilter, ...updates };
    setLocalFilter(newFilter);
    onFilterChange(newFilter);
  };

  const toggleArrayFilter = (key: keyof EventFilter, value: string) => {
    const currentArray = (localFilter[key] as string[]) || [];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    
    updateFilter({ [key]: newArray.length > 0 ? newArray : undefined });
  };

  const clearFilter = (key: keyof EventFilter) => {
    updateFilter({ [key]: undefined });
  };

  const clearAllFilters = () => {
    const clearedFilter: EventFilter = {
      task_id: filter.task_id // Keep task_id
    };
    setLocalFilter(clearedFilter);
    onFilterChange(clearedFilter);
  };

  const applyDateRange = (range: { start: Date; end: Date }) => {
    updateFilter({ date_range: range });
    setShowDatePicker(false);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilter.agent_types?.length) count++;
    if (localFilter.action_types?.length) count++;
    if (localFilter.statuses?.length) count++;
    if (localFilter.search_query) count++;
    if (localFilter.date_range) count++;
    return count;
  };

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <span className="font-medium">Filters</span>
            {getActiveFilterCount() > 0 && (
              <Badge variant="secondary" className="text-xs">
                {getActiveFilterCount()} active
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            disabled={getActiveFilterCount() === 0}
          >
            Clear All
          </Button>
        </div>

        {/* Search */}
        <div className="space-y-2">
          <Label>Search in titles and descriptions</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={localFilter.search_query || ""}
              onChange={(e) => updateFilter({ search_query: e.target.value || undefined })}
              className="pl-10"
            />
            {localFilter.search_query && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearFilter("search_query")}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* Date Range */}
        <div className="space-y-2">
          <Label>Date Range</Label>
          <div className="flex flex-wrap gap-2">
            {dateRangePresets.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                onClick={() => applyDateRange(preset.getValue())}
                className="text-xs"
              >
                {preset.label}
              </Button>
            ))}
            <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs">
                  <CalendarIcon className="h-3 w-3 mr-1" />
                  Custom
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{
                    from: localFilter.date_range?.start,
                    to: localFilter.date_range?.end
                  }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      applyDateRange({ start: range.from, end: range.to });
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
          {localFilter.date_range && (
            <div className="flex items-center justify-between bg-muted p-2 rounded text-sm">
              <span>
                {format(localFilter.date_range.start, "PPP")} - {format(localFilter.date_range.end, "PPP")}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearFilter("date_range")}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        <Separator />

        {/* Agent Types */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Agent Types</Label>
            {localFilter.agent_types?.length && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearFilter("agent_types")}
                className="text-xs h-6"
              >
                Clear
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {agentStats.map(({ value, label, icon: Icon, color, count }) => (
              <div
                key={value}
                className="flex items-center space-x-2 cursor-pointer hover:bg-accent p-2 rounded"
                onClick={() => toggleArrayFilter("agent_types", value)}
              >
                <Checkbox
                  checked={localFilter.agent_types?.includes(value) || false}
                  onChange={() => {}} // Handled by parent onClick
                />
                <Icon className={cn("h-4 w-4", color)} />
                <span className="text-sm flex-1">{label}</span>
                <Badge variant="outline" className="text-xs">
                  {count}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Action Types */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Action Types</Label>
            {localFilter.action_types?.length && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearFilter("action_types")}
                className="text-xs h-6"
              >
                Clear
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {actionStats.map(({ value, label, icon: Icon, color, count }) => (
              <div
                key={value}
                className="flex items-center space-x-2 cursor-pointer hover:bg-accent p-2 rounded"
                onClick={() => toggleArrayFilter("action_types", value)}
              >
                <Checkbox
                  checked={localFilter.action_types?.includes(value) || false}
                  onChange={() => {}} // Handled by parent onClick
                />
                <Icon className={cn("h-4 w-4", color)} />
                <span className="text-sm flex-1">{label}</span>
                <Badge variant="outline" className="text-xs">
                  {count}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Status</Label>
            {localFilter.statuses?.length && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearFilter("statuses")}
                className="text-xs h-6"
              >
                Clear
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {statusStats.map(({ value, label, icon: Icon, color, count }) => (
              <div
                key={value}
                className="flex items-center space-x-2 cursor-pointer hover:bg-accent p-2 rounded"
                onClick={() => toggleArrayFilter("statuses", value)}
              >
                <Checkbox
                  checked={localFilter.statuses?.includes(value) || false}
                  onChange={() => {}} // Handled by parent onClick
                />
                <Icon className={cn("h-4 w-4", color)} />
                <span className="text-sm flex-1">{label}</span>
                <Badge variant="outline" className="text-xs">
                  {count}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Active Filters Summary */}
        {getActiveFilterCount() > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label>Active Filters</Label>
              <div className="flex flex-wrap gap-2">
                {localFilter.agent_types?.map(agent => (
                  <Badge
                    key={agent}
                    variant="secondary"
                    className="text-xs cursor-pointer hover:bg-secondary/80"
                    onClick={() => toggleArrayFilter("agent_types", agent)}
                  >
                    {agentTypeOptions.find(a => a.value === agent)?.label}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
                {localFilter.action_types?.map(action => (
                  <Badge
                    key={action}
                    variant="secondary"
                    className="text-xs cursor-pointer hover:bg-secondary/80"
                    onClick={() => toggleArrayFilter("action_types", action)}
                  >
                    {actionTypeOptions.find(a => a.value === action)?.label}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
                {localFilter.statuses?.map(status => (
                  <Badge
                    key={status}
                    variant="secondary"
                    className="text-xs cursor-pointer hover:bg-secondary/80"
                    onClick={() => toggleArrayFilter("statuses", status)}
                  >
                    {statusOptions.find(s => s.value === status)?.label}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
                {localFilter.search_query && (
                  <Badge
                    variant="secondary"
                    className="text-xs cursor-pointer hover:bg-secondary/80"
                    onClick={() => clearFilter("search_query")}
                  >
                    Search: "{localFilter.search_query}"
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                )}
                {localFilter.date_range && (
                  <Badge
                    variant="secondary"
                    className="text-xs cursor-pointer hover:bg-secondary/80"
                    onClick={() => clearFilter("date_range")}
                  >
                    Date Range
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};