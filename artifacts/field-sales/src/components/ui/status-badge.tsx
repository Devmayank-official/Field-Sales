import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType = "Lead" | "Contacted" | "Active" | "High Value" | "Inactive" | "Good" | "Needs Repair" | "Critical" | "Dead" | "active" | "completed";

export function StatusBadge({ status, className }: { status: StatusType, className?: string }) {
  let colorClass = "bg-muted text-muted-foreground";

  switch (status) {
    case "Active":
    case "Good":
    case "completed":
      colorClass = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
      break;
    case "High Value":
      colorClass = "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20";
      break;
    case "Contacted":
    case "active":
      colorClass = "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20";
      break;
    case "Needs Repair":
      colorClass = "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/20";
      break;
    case "Inactive":
    case "Critical":
    case "Dead":
      colorClass = "bg-destructive/15 text-destructive dark:text-red-400 border-destructive/20";
      break;
    case "Lead":
    default:
      colorClass = "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/20";
      break;
  }

  return (
    <Badge variant="outline" className={cn("capitalize font-semibold rounded-full px-2.5 py-0.5", colorClass, className)}>
      {status === 'active' ? 'In Progress' : status}
    </Badge>
  );
}
