"use client";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import * as React from "react";

import {
  type GeneralNVType,
  ProductStatuses,
  TicketStatus,
} from "@/types/enum";
type ComboboxProps = {
  disabled: boolean;
  defaultValue: number;
  onChange?: (newStatus: number) => void;
};

export const TicketStatusM: GeneralNVType[] = [
  {
    value: TicketStatus.Open,
    label: "Open",
  },
  {
    value: TicketStatus.Active,
    label: "Active",
  },
  {
    value: TicketStatus.Closed,
    label: "Closed",
  },
  {
    value: TicketStatus.Postponed,
    label: "Postponed",
  },
  {
    value: TicketStatus.Archived,
    label: "Archived",
  },
  {
    value: TicketStatus.Merged,
    label: "Merged",
  },
];

export const TicketStatusCombobox = ({
  disabled,
  defaultValue,
  onChange,
  ...props
}: ComboboxProps) => {
  const [open, setOpen] = React.useState(false);

  const [selectedStatus, setSelectedStatus] =
    React.useState<GeneralNVType | null>(
      //default to 'defaultValue'
      ProductStatuses.find((o) => o.value === defaultValue) || null,
    );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-[150px]"
          disabled={disabled}
          {...props}
        >
          {selectedStatus ? <>{selectedStatus.label}</> : <>+ Set status</>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" side="right" align="start">
        <Command>
          <CommandInput placeholder="Change status..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {TicketStatusM.map((status) => (
                <CommandItem
                  key={status.value}
                  value={String(status.value)}
                  onSelect={(value) => {
                    setSelectedStatus(
                      TicketStatusM.find((o) => o.value === Number(value)) ||
                        null,
                    );
                    //return value to parent component
                    onChange?.(Number(value));
                    setOpen(false);
                  }}
                >
                  {status.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
