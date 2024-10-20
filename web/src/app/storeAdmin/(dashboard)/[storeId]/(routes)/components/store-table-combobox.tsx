"use client";

//import { Currency } from '@prisma/client';
import { useTranslation } from "@/app/i18n/client";
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
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";
import type { StoreTables } from "@prisma/client";
import { CheckIcon } from "lucide-react";
import * as React from "react";
import useSWR from "swr";

type ComboboxProps = {
  storeId: string;
  disabled: boolean;
  defaultValue: string;
  onValueChange?: (newValue: string) => void;
};

export const StoreTableCombobox = ({
  storeId,
  disabled,
  defaultValue,
  onValueChange,
  ...props
}: ComboboxProps) => {
  const { lng } = useI18n();
  const { t } = useTranslation(lng);

  const url = `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${storeId}/tables`;
  const fetcher = (url: RequestInfo) => fetch(url).then((res) => res.json());
  const { data, error, isLoading } = useSWR(url, fetcher);
  let tables: StoreTables[] = [];
  if (!isLoading && !error) {
    tables = data as StoreTables[];
  }

  /*
  tables.push({
    id: "",
    tableName: "---",
    storeId: storeId, capacity: 0
  });
  */

  const [open, setOpen] = React.useState(false);

  // combox is buggy if default value is empty....
  //if (defaultValue === "" || defaultValue === null) defaultValue = "TWD";
  //console.log('default: ' + defaultValue);

  const [selected, setSelected] = React.useState<string | null>(defaultValue);
  const [displayName, setDisplayName] = React.useState<string | null>();

  //console.log('defaultValue: ' + defaultValue);
  //console.log('selected: ' + JSON.stringify(selected));
  if (error) return <div>failed to load</div>;
  if (isLoading) return <div>loading...</div>;
  if (data && !isLoading && !error) {
    //console.log('data: ' + JSON.stringify(data));
    return (
      <>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className=""
              disabled={disabled}
              {...props}
            >
              {selected ? <>{displayName}</> : <>+ tables </>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0" side="bottom" align="start">
            <Command>
              <CommandInput placeholder="" />
              <CommandList>
                <CommandEmpty> --- </CommandEmpty>
                <CommandGroup>
                  {tables.map((table) => (
                    <CommandItem
                      key={table.id}
                      value={table.id}
                      onSelect={(newValue) => {
                        //console.log('onSelect: ' + value);
                        setSelected(newValue);
                        setDisplayName(table.tableName);
                        onValueChange?.(newValue); //return value to parent component
                        setOpen(false);
                      }}
                    >
                      {table.tableName}
                      <CheckIcon
                        className={cn(
                          "ml-auto h-4 w-4",
                          selected === table.id ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </>
    );
  }
};
