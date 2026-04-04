import { cn } from "@/lib/utils";
import { COLOR_LABELS, type ColorLabel } from "@/lib/schema";
import { Check, X } from "lucide-react";

const DOT_COLORS: Record<ColorLabel, string> = {
  red:    "bg-red-500",
  orange: "bg-orange-500",
  amber:  "bg-amber-400",
  green:  "bg-green-500",
  blue:   "bg-blue-500",
  purple: "bg-purple-500",
};

interface ColorLabelPickerProps {
  value?: ColorLabel;
  onChange: (label: ColorLabel | undefined) => void;
}

export function ColorLabelPicker({ value, onChange }: ColorLabelPickerProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {COLOR_LABELS.map((label) => (
        <button
          key={label}
          type="button"
          onClick={() => onChange(value === label ? undefined : label)}
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm",
            DOT_COLORS[label],
            value === label ? "scale-110 ring-2 ring-offset-2 ring-offset-background" : "opacity-70 hover:opacity-100 hover:scale-105",
            value === label && label === "red"    && "ring-red-500",
            value === label && label === "orange" && "ring-orange-500",
            value === label && label === "amber"  && "ring-amber-400",
            value === label && label === "green"  && "ring-green-500",
            value === label && label === "blue"   && "ring-blue-500",
            value === label && label === "purple" && "ring-purple-500",
          )}
        >
          {value === label && <Check className="w-4 h-4 text-white" strokeWidth={2.5} />}
        </button>
      ))}
      {value && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-muted hover:bg-muted/80 transition-colors"
          title="Clear label"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
