"use client";

import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime, getAbsoluteUrl } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";
import type { Store } from "@/types";
import { useParams, useRouter } from "next/navigation";

import { ConfirmModal } from "@/components/modals/cofirm-modal";

import {
	Elements,
	LinkAuthenticationElement,
	PaymentElement,
	useElements,
	useStripe,
} from "@stripe/react-stripe-js";

import type { Appearance, StripeElementsOptions } from "@stripe/stripe-js";

import { useSession } from "next-auth/react";
import { type ChangeEvent, useEffect, useState } from "react";

import getStripe from "@/lib/stripe/client";

import { StoreLevel, SubscriptionStatus } from "@/types/enum";
import type { Subscription, SubscriptionPayment } from "@prisma/client";
import axios from "axios";
import { formatDate } from "date-fns";
import { useTheme } from "next-themes";
import Link from "next/link";

export function SubscriptionHistoryClient({
	store,
	subscription,
	payments,
}: {
	store: Store;
	subscription: Subscription | null;
	payments: SubscriptionPayment[];
}) {
	return <></>;
}
