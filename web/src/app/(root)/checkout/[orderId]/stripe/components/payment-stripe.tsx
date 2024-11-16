"use client";
import { useRouter } from "next/navigation";

import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
import { getAbsoluteUrl } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";
import { useElements, useStripe } from "@stripe/react-stripe-js";
import { type ChangeEvent, useEffect, useState } from "react";

import getStripe from "@/lib/stripe/client";
import type { StoreOrder } from "@prisma/client";
import {
  Elements,
  LinkAuthenticationElement,
  PaymentElement,
} from "@stripe/react-stripe-js";
import type { Appearance, StripeElementsOptions } from "@stripe/stripe-js";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";

type paymentProps = {
  order: StoreOrder;
};

// SECTION PaymentStripe creates a stripe payment intent, and then use it to display payment form provided by stripe (<Elements/>).
// Following the payment form, a Pay button is displayed (<StripePayButton/>) for user to process the payment.
//
const PaymentStripe: React.FC<paymentProps> = ({ order }) => {
  const { lng } = useI18n();
  const { t } = useTranslation(lng, "payment-stripe");

  if (!order.id) throw Error("order is required.");
  if (Number.isNaN(Number(order.orderTotal)))
    throw Error("orderTotal must be a number.");

  if (Number(order.orderTotal) <= 0)
    throw Error("orderTotal should greater than zero.");

  const [clientSecret, setClientSecret] = useState("");

  //console.log(JSON.stringify(order.isPaid));
  //console.log(`clientSecret:${JSON.stringify(clientSecret)}`);

  //call payment intent api to get client secret
  useEffect(() => {
    if (order.isPaid) return;
    //if (clientSecret !== null) return;

    const url = `${process.env.NEXT_PUBLIC_API_URL}/payment/stripe/create-payment-intent`;
    const body = JSON.stringify({
      total: Number(order.orderTotal),
      currency: order.currency,
    });

    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body,
    })
      .then((res) => res.json())
      .then((data) => {
        setClientSecret(data.client_secret);
        //console.log('clientSecret: ' + JSON.stringify(data.client_secret));
      });
  }, [order]);

  const session = useSession();
  let email = session.data?.user?.email as string;
  if (!email) email = "";

  let name = session.data?.user?.name as string;
  if (!name) name = "";

  const { resolvedTheme } = useTheme();
  //console.log(resolvedTheme);
  const appearance: Appearance = {
    theme: resolvedTheme === "light" ? "flat" : "night",
  };

  const options: StripeElementsOptions = {
    // pass the client secret
    clientSecret: clientSecret,
    //mode: "payment",
    //amount: orderTotal * 100,
    //currency: currency,
    // Fully customizable with appearance API.
    appearance: appearance,
  };
  //const [message, setMessage] = useState("");
  //const [isLoading, setIsLoading] = useState(false);
  const stripePromise = getStripe();

  const router = useRouter();
  if (order.isPaid) {
    router.push(`/${order.storeId}/billing/${order.id}`);
    return;
  }

  return (
    clientSecret !== "" &&
    stripePromise !== null && (
      <Elements key={clientSecret} stripe={stripePromise} options={options}>
        <LinkAuthenticationElement
          id="link-authentication-element"
          // Access the email value like so:
          // onChange={(event) => {
          //  setEmail(event.value.email);
          // }}
          //
          // Prefill the email field like so:
          options={{ defaultValues: { email: email } }}
        />
        <PaymentElement
          id="payment-element"
          options={{
            defaultValues: {
              billingDetails: {
                email: email,
                name: name,
              },
            },
          }}
        />
        <div>
          {t("payment_stripe_payAmount")}
          {Number(order.orderTotal)} {order.currency.toUpperCase()}
        </div>
        <StripePayButton orderId={order.id} />
      </Elements>
    )
  );
};

export default PaymentStripe;

const defaultFormFields = {
  displayName: "",
  email: "",
};
type PaymentStripeProp = {
  orderId: string;
};

//SECTION - As user clicks the pay button, we call stripe.confirmPayment to verify the payment status.
// If payment is confirmed, redirect user to success page (return_url).
// if payment is NOT confirmed, display error message.
//
const StripePayButton: React.FC<PaymentStripeProp> = ({ orderId }) => {
  const router = useRouter();
  const { lng } = useI18n();
  const { t } = useTranslation(lng, "payment-stripe");

  //const [mounted, setMounted] = useState(false);

  const elements = useElements();
  const stripe = useStripe();
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [formFields, setFormFields] = useState(defaultFormFields);
  //const { displayName, email } = formFields;

  const returnUrl = `${getAbsoluteUrl()}/checkout/${orderId}/stripe/confirmed`;

  const fetchData = async () => {
    if (!stripe || !elements) {
      // Stripe.js hasn't yet loaded.
      // Make sure to disable form submission until Stripe.js has loaded.
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // redirect to route thankyou
        //return_url: 'http://localhost:3001/checkout/success',
        return_url: returnUrl,
      },
    });

    if (error) {
      // This point will only be reached if there is an immediate error when
      // confirming the payment. Show error to your customer (for example, payment
      // details incomplete)
      setErrorMessage(error.message);
      console.log(`paymentHandler: ${error.message}`);
    } else {
      // Your customer will be redirected to your `return_url`. For some payment
      // methods like iDEAL, your customer will be redirected to an intermediate
      // site first to authorize the payment, then redirected to the `return_url`.
      console.log("payment confirmed");
      router.push(returnUrl);
    }
  };

  // if payment is not confirmed, do this every 5 sec.
  const IntervaledContent = () => {
    const [count, setCount] = useState(0);

    useEffect(() => {
      //Implementing the setInterval method
      const interval = setInterval(() => {
        fetchData();
        setCount(count + 1);

        if (count > 5) {
          // give up after 5 retries
          clearInterval(interval);
        }
      }, 3000); // do every 3 sec.

      //Clearing the interval
      return () => clearInterval(interval);
    }, [count]);
  };

  const paymentHandler = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    setIsProcessingPayment(true);

    // first fetch
    fetchData();

    IntervaledContent();

    setIsProcessingPayment(false);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormFields({ ...formFields, [name]: value });
  };

  return (
    <form onSubmit={paymentHandler}>
      {errorMessage && (
        <div className="bold mt-2 rounded-md bg-pink-100 p-2 text-pink-500">
          {errorMessage}
        </div>
      )}
      {/* isLoading will disable the button on its first click.
          //bg-gradient-to-r from-purple-400 to-pink-600 font-semibold hover:from-green-400 hover:to-blue-500 */}
      <Button
        disabled={isProcessingPayment}
        type="submit"
        className="w-full disabled:opacity-25"
      >
        {t("payment_stripeForm_payButton")}
      </Button>
    </form>
  );
};
