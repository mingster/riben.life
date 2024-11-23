import Container from "@/components/ui/container";

import { populateCountryData } from "@/actions/admin/populate-country-data";
import { populateCurrencyData } from "@/actions/admin/populate-currency-data";
import {
  create_locales,
  create_paymentMethods,
  create_shippingMethods,
} from "@/actions/admin/populate-payship_defaults";

import { sqlClient } from "@/lib/prismadb";

//type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function InstallDefaultDataPage(props: {
  //params: Params;
  searchParams: SearchParams;
}) {
  //const params = await props.params;

  // add default payment methods to all store that does not have the payment methods yet
  const stores = await sqlClient.store.findMany({});
  const defaultPaymentMethods = await sqlClient.paymentMethod.findMany({
    where: {
      isDefault: true,
    },
  });

  for (const store of stores) {
    for (const defaultPaymentMethod of defaultPaymentMethods) {
      // delete default payment method that already exists
      await sqlClient.storePaymentMethodMapping.deleteMany({
        where: {
          storeId: store.id,
          methodId: defaultPaymentMethod.id,
        },
      });

      // add default payment methods for each store
      await sqlClient.storePaymentMethodMapping.create({
        data: {
          storeId: store.id,
          methodId: defaultPaymentMethod.id,
        },
      });
    }
  }
  console.log("default payment method updated.");

  const countryCount = await sqlClient.country.count();
  if (countryCount === 0) {
    await populateCountryData();
  }
  console.log(`countryCount:${countryCount}`);

  const currencyCount = await sqlClient.currency.count();
  if (currencyCount === 0) {
    await populateCurrencyData();
  }
  console.log(`currencyCount:${currencyCount}`);

  const paymentMethods = await sqlClient.paymentMethod.findMany();
  if (paymentMethods.length === 0) {
    await create_paymentMethods();
  }
  console.log(`paymentMethods:${JSON.stringify(paymentMethods)}`);

  const shippingMethods = await sqlClient.shippingMethod.findMany();
  if (shippingMethods.length === 0) {
    await create_shippingMethods();
  }
  console.log(`shippingMethods:${JSON.stringify(shippingMethods)}`);

  const localeCount = await sqlClient.locale.count();
  if (localeCount === 0) {
    await create_locales();
  }
  console.log(`localeCount:${localeCount}`);

  return <Container>DONE</Container>;
}
