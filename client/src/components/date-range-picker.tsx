import * as React from "react";
import { addDays, format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  date: DateRange | undefined;
  onDateChange: (date: DateRange) => void;
  className?: string;
}

export function DateRangePicker({
  date,
  onDateChange,
  className,
}: DateRangePickerProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal bg-slate-950/50 border-slate-800",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Date Range Filter</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={(newDate) => onDateChange(newDate as DateRange)}
            numberOfMonths={2}
          />
          <div className="p-3 border-t border-slate-700 flex justify-between">
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-slate-700"
              onClick={() => 
                onDateChange({
                  from: new Date(),
                  to: new Date(),
                })
              }
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-slate-700"
              onClick={() => 
                onDateChange({
                  from: addDays(new Date(), -7),
                  to: new Date(),
                })
              }
            >
              Last 7 days
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-slate-700"
              onClick={() => 
                onDateChange({
                  from: addDays(new Date(), -30),
                  to: new Date(),
                })
              }
            >
              Last 30 days
            </Button>
          </div>
          <div className="p-3 border-t border-slate-700 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-slate-400"
              onClick={() => onDateChange({ from: undefined, to: undefined })}
            >
              Clear
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}