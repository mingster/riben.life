"use client";

import type { Store } from "@/types";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

import Container from "@/components/ui/container";
import { StoreLevel } from "@/types/enum";
import { CashCashier } from "../cash-cashier/data-client";
import { Awaiting4ConfirmationClient } from "../order/awaiting4Confirmation/client";
import { Awaiting4ProcessingClient } from "../order/awaiting4Process/client";

export interface props {
  store: Store;
}

// store admin home page.
// it checks for new orders every 5 seconds.
export const StoreAdminDashboard: React.FC<props> = ({ store }) => {
  const { lng } = useI18n();
  const { t } = useTranslation(lng, "storeAdmin");

  //console.log(JSON.stringify(storeData));
  return (
    <section className="relative w-full">
      <Container>
        {
          //show cash cashier if store subscribes pro level (not free)
          store.level !== StoreLevel.Free && (
            <CashCashier store={store} tables={[]} />
          )
        }

        {store.level === StoreLevel.Free && !store.autoAcceptOrder && (
          <Awaiting4ConfirmationClient store={store} />
        )}

        <Awaiting4ProcessingClient store={store} />
      </Container>
    </section>
  );
};
