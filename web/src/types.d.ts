/* Prisma 7: `Prisma.validator` was removed; use `satisfies` + `*GetPayload` from generated model types. */

import type {
	CategoryDefaultArgs,
	CategoryGetPayload,
} from "@/generated/prisma/models/Category";
import type {
	CustomerCreditDefaultArgs,
	CustomerCreditGetPayload,
} from "@/generated/prisma/models/CustomerCredit";
import type {
	CustomerCreditLedgerDefaultArgs,
	CustomerCreditLedgerGetPayload,
} from "@/generated/prisma/models/CustomerCreditLedger";
import type {
	CustomerFiatLedgerDefaultArgs,
	CustomerFiatLedgerGetPayload,
} from "@/generated/prisma/models/CustomerFiatLedger";
import type {
	CustomerInviteDefaultArgs,
	CustomerInviteGetPayload,
} from "@/generated/prisma/models/CustomerInvite";
import type {
	EmailQueueDefaultArgs,
	EmailQueueGetPayload,
} from "@/generated/prisma/models/EmailQueue";
import type {
	FaqCategoryDefaultArgs,
	FaqCategoryGetPayload,
} from "@/generated/prisma/models/FaqCategory";
import type {
	FaqDefaultArgs,
	FaqGetPayload,
} from "@/generated/prisma/models/Faq";
import type {
	LocaleDefaultArgs,
	LocaleGetPayload,
} from "@/generated/prisma/models/Locale";
import type {
	MessageQueueDefaultArgs,
	MessageQueueGetPayload,
} from "@/generated/prisma/models/MessageQueue";
import type {
	MessageTemplateDefaultArgs,
	MessageTemplateGetPayload,
} from "@/generated/prisma/models/MessageTemplate";
import type {
	MessageTemplateLocalizedDefaultArgs,
	MessageTemplateLocalizedGetPayload,
} from "@/generated/prisma/models/MessageTemplateLocalized";
import type {
	PlatformSettingsDefaultArgs,
	PlatformSettingsGetPayload,
} from "@/generated/prisma/models/PlatformSettings";
import type {
	ProductCategoriesDefaultArgs,
	ProductCategoriesGetPayload,
} from "@/generated/prisma/models/ProductCategories";
import type {
	ProductDefaultArgs,
	ProductGetPayload,
} from "@/generated/prisma/models/Product";
import type {
	ProductOptionDefaultArgs,
	ProductOptionGetPayload,
} from "@/generated/prisma/models/ProductOption";
import type {
	RsvpDefaultArgs,
	RsvpGetPayload,
} from "@/generated/prisma/models/Rsvp";
import type {
	RsvpBlacklistDefaultArgs,
	RsvpBlacklistGetPayload,
} from "@/generated/prisma/models/RsvpBlacklist";
import type {
	RsvpReminderSentDefaultArgs,
	RsvpReminderSentGetPayload,
} from "@/generated/prisma/models/RsvpReminderSent";
import type {
	RsvpSettingsDefaultArgs,
	RsvpSettingsGetPayload,
} from "@/generated/prisma/models/RsvpSettings";
import type {
	RsvpTagDefaultArgs,
	RsvpTagGetPayload,
} from "@/generated/prisma/models/RsvpTag";
import type {
	ServiceStaffDefaultArgs,
	ServiceStaffGetPayload,
} from "@/generated/prisma/models/ServiceStaff";
import type {
	StoreDefaultArgs,
	StoreGetPayload,
} from "@/generated/prisma/models/Store";
import type {
	StoreFacilityDefaultArgs,
	StoreFacilityGetPayload,
} from "@/generated/prisma/models/StoreFacility";
import type {
	StoreOrderDefaultArgs,
	StoreOrderGetPayload,
} from "@/generated/prisma/models/StoreOrder";
import type {
	StorePaymentMethodMappingDefaultArgs,
	StorePaymentMethodMappingGetPayload,
} from "@/generated/prisma/models/StorePaymentMethodMapping";
import type {
	StoreProductOptionTemplateDefaultArgs,
	StoreProductOptionTemplateGetPayload,
} from "@/generated/prisma/models/StoreProductOptionTemplate";
import type {
	StoreSettingsDefaultArgs,
	StoreSettingsGetPayload,
} from "@/generated/prisma/models/StoreSettings";
import type {
	StoreShipMethodMappingDefaultArgs,
	StoreShipMethodMappingGetPayload,
} from "@/generated/prisma/models/StoreShipMethodMapping";
import type {
	SupportTicketDefaultArgs,
	SupportTicketGetPayload,
} from "@/generated/prisma/models/SupportTicket";
import type {
	SystemMessageDefaultArgs,
	SystemMessageGetPayload,
} from "@/generated/prisma/models/SystemMessage";
import type {
	UserDefaultArgs,
	UserGetPayload,
} from "@/generated/prisma/models/User";
import type {
	system_logsDefaultArgs,
	system_logsGetPayload,
} from "@/generated/prisma/models/system_logs";
import { rsvpPayloadArgs } from "@/types/prisma-payloads";

/* #region next-auth */
/*
declare module "next-auth" {
	interface Session {
		id: string | null | unknown;
		user: User & DefaultSession["user"];
		error?: "RefreshAccessTokenError";

		user?: DefaultUser & {
			id: string;
			stripeCustomerId: string;
			isActive: boolean;
			role: string | null;
			notifications: Notification[];
		};
	}
	interface User extends DefaultUser {
		stripeCustomerId: string;
		isActive: boolean;
		role: string | null;
		notifications: Notification[];
	}
}

declare module "next-auth/jwt" {
	interface JWT {
		access_token: string;
		expires_at: number;
		refresh_token: string;
		error?: "RefreshAccessTokenError";
	}
}
*/
/* #endregion */

/* #region prisma type mod */

const platformSettingsObj = {} satisfies PlatformSettingsDefaultArgs;
export type PlatformSettings = PlatformSettingsGetPayload<
	typeof platformSettingsObj
>;

const systemLogObj = {} satisfies system_logsDefaultArgs;
export type SystemLog = system_logsGetPayload<typeof systemLogObj>;

const localeObj = {} satisfies LocaleDefaultArgs;
export type Locale = LocaleGetPayload<typeof localeObj>;

const messageTemplateObj = {
	include: {
		MessageTemplateLocalized: true,
	},
} satisfies MessageTemplateDefaultArgs;
export type MessageTemplate = MessageTemplateGetPayload<
	typeof messageTemplateObj
>;

const messageTemplateLocalizedObj =
	{} satisfies MessageTemplateLocalizedDefaultArgs;
export type MessageTemplateLocalized = MessageTemplateLocalizedGetPayload<
	typeof messageTemplateLocalizedObj
>;

const emailQueueObj = {} satisfies EmailQueueDefaultArgs;
export type EmailQueue = EmailQueueGetPayload<typeof emailQueueObj>;

export enum CartProductStatus {
	InProgress = 0, // customization is work-in-progress
	ReadyToCheckout = 1, //saved in cart, ready to checkout
}

const categoryObj = {
	include: {
		ProductCategories: true,
	},
} satisfies CategoryDefaultArgs;
export type Category = CategoryGetPayload<typeof categoryObj>;

const paymethodMappingObj = {
	include: { PaymentMethod: true },
} satisfies StorePaymentMethodMappingDefaultArgs;
export type StorePaymentMethodMapping = StorePaymentMethodMappingGetPayload<
	typeof paymethodMappingObj
>;

export const shipmethodMappingObj = {
	include: { ShippingMethod: true },
} satisfies StoreShipMethodMappingDefaultArgs;
export type StoreShipMethodMapping = StoreShipMethodMappingGetPayload<
	typeof shipmethodMappingObj
>;

const storeCategoryObj = {
	include: {
		StoreShippingMethods: {
			include: { ShippingMethod: true },
		},
		StorePaymentMethods: {
			include: { PaymentMethod: true },
		},
		Categories: { include: { ProductCategories: true } },
	},
} satisfies StoreDefaultArgs;
export type StoreWithProductNCategories = StoreGetPayload<
	typeof storeCategoryObj
>;

const storeObj = {
	include: {
		Organization: true,
		Categories: true,
		StoreAnnouncement: true,
		Owner: true,
		Products: true,
		StoreOrders: true,
		StoreShippingMethods: {
			include: {
				ShippingMethod: true,
			},
		},
		StorePaymentMethods: {
			include: {
				PaymentMethod: true,
			},
		},
		SupportTicket: true,
	},
} satisfies StoreDefaultArgs;
export type Store = StoreGetPayload<StoreDefaultArgs> &
	Partial<StoreGetPayload<typeof storeObj>>;

const storeWithProductObj = {
	include: {
		StoreFacilities: true,
		StoreShippingMethods: {
			include: { ShippingMethod: true },
		},
		StorePaymentMethods: {
			include: { PaymentMethod: true },
		},
		Categories: {
			include: {
				ProductCategories: {
					include: {
						Product: {
							include: {
								ProductImages: true,
								ProductAttribute: true,
								//ProductCategories: true,
								ProductOptions: {
									include: {
										ProductOptionSelections: true,
									},
								},
							},
						},
					},
				},
			},
		},
	},
} satisfies StoreDefaultArgs;
export type StoreWithProducts = StoreGetPayload<typeof storeWithProductObj>;

const orderObj = {
	include: {
		Store: true,
		OrderNotes: true,
		OrderItemView: true,
		User: true,
		ShippingMethod: true,
		PaymentMethod: true,
	},
} satisfies StoreOrderDefaultArgs;
export type StoreOrder = StoreOrderGetPayload<typeof orderObj>;

const prodCategoryObj = {
	include: {
		Product: {
			include: {
				ProductImages: true,
				ProductAttribute: true,
				ProductOptions: {
					include: {
						ProductOptionSelections: true,
					},
				},
				ProductCategories: true,
			},
		},
	},
} satisfies ProductCategoriesDefaultArgs;
export type ProductCategories = ProductCategoriesGetPayload<
	typeof prodCategoryObj
>;

const productObj = {
	include: {
		ProductImages: true,
		ProductAttribute: true,
		ProductCategories: true,
		ProductOptions: {
			include: {
				ProductOptionSelections: true,
			},
		},
	},
} satisfies ProductDefaultArgs;
export type Product = ProductGetPayload<typeof productObj>;

const productOptionObj = {
	include: {
		ProductOptionSelections: true,
	},
} satisfies ProductOptionDefaultArgs;
export type ProductOption = ProductOptionGetPayload<typeof productOptionObj>;

const storeProductOptionTemplateObj = {
	include: {
		StoreProductOptionSelectionsTemplate: true,
	},
} satisfies StoreProductOptionTemplateDefaultArgs;
export type StoreProductOptionTemplate = StoreProductOptionTemplateGetPayload<
	typeof storeProductOptionTemplateObj
>;

const userObj = {
	include: {
		accounts: true,
		twofactors: true,
		passkeys: true,
		apikeys: true,
		sessions: true,
		members: true,
		invitations: true,
		Addresses: true,
		Orders: true,
		Reservations: true,
		CustomerCredit: true,
		CustomerCreditLedger: true,
		StoreLedgerCreated: true,
		//NotificationTo: true,
	},
} satisfies UserDefaultArgs;
export type User = UserGetPayload<UserDefaultArgs> &
	Partial<UserGetPayload<typeof userObj>>;

const customerInviteObj = {
	include: {
		User: true,
		Store: true,
		Inviter: true,
	},
} satisfies CustomerInviteDefaultArgs;
export type CustomerInvite = CustomerInviteGetPayload<typeof customerInviteObj>;

const sysmsgObj = {} satisfies SystemMessageDefaultArgs;
export type SystemMessage = SystemMessageGetPayload<typeof sysmsgObj>;

const FaqCategoryObj = {
	include: {
		FAQ: true,
	},
} satisfies FaqCategoryDefaultArgs;
export type FaqCategory = FaqCategoryGetPayload<typeof FaqCategoryObj>;

const faqObj = {
	include: {
		FaqCategory: true,
	},
} satisfies FaqDefaultArgs;
export type Faq = FaqGetPayload<typeof faqObj>;

const supportTicketObj = {
	include: {
		Sender: true,
	},
} satisfies SupportTicketDefaultArgs;
export type SupportTicket = SupportTicketGetPayload<typeof supportTicketObj>;

const notificationObj = {
	include: {
		Sender: {
			select: {
				id: true,
				name: true,
				email: true,
			},
		},
		Recipient: {
			select: {
				id: true,
				name: true,
				email: true,
			},
		},
	},
} satisfies MessageQueueDefaultArgs;
export type MessageQueue = MessageQueueGetPayload<typeof notificationObj>;

const rsvpReminderSentObj = {
	include: {
		Rsvp: true,
		Store: true,
		User: true,
	},
} satisfies RsvpReminderSentDefaultArgs;
export type RsvpReminderSent = RsvpReminderSentGetPayload<
	typeof rsvpReminderSentObj
>;

const customerCreditObj = {
	include: {
		User: true,
	},
} satisfies CustomerCreditDefaultArgs;
export type CustomerCredit = CustomerCreditGetPayload<typeof customerCreditObj>;

const customerCreditLedgerObj = {
	include: {
		Store: true,
		User: true,
		Creator: true,
		StoreOrder: true,
	},
} satisfies CustomerCreditLedgerDefaultArgs;
export type CustomerCreditLedger = CustomerCreditLedgerGetPayload<
	typeof customerCreditLedgerObj
>;

const customerFiatLedgerObj = {
	include: {
		Store: true,
		User: true,
		Creator: true,
		StoreOrder: true,
	},
} satisfies CustomerFiatLedgerDefaultArgs;
export type CustomerFiatLedger = CustomerFiatLedgerGetPayload<
	typeof customerFiatLedgerObj
>;

const storeFacilityObj = {
	include: {
		Store: true,
		Rsvp: true,
		FacilityPricingRules: true,
	},
} satisfies StoreFacilityDefaultArgs;
export type StoreFacility = StoreFacilityGetPayload<StoreFacilityDefaultArgs> &
	Partial<StoreFacilityGetPayload<typeof storeFacilityObj>>;

const serviceStaffObj = {
	include: {
		Store: true,
		User: true,
	},
} satisfies ServiceStaffDefaultArgs;
export type ServiceStaff = ServiceStaffGetPayload<typeof serviceStaffObj>;

export type Rsvp = RsvpGetPayload<RsvpDefaultArgs> &
	Partial<RsvpGetPayload<typeof rsvpPayloadArgs>>;

const storeSettingsObj = {} satisfies StoreSettingsDefaultArgs;
export type StoreSettings = StoreSettingsGetPayload<typeof storeSettingsObj>;

const rsvpSettingsObj = {} satisfies RsvpSettingsDefaultArgs;
export type RsvpSettings = RsvpSettingsGetPayload<typeof rsvpSettingsObj>;

const rsvpBlacklistObj = {} satisfies RsvpBlacklistDefaultArgs;
export type RsvpBlacklist = RsvpBlacklistGetPayload<typeof rsvpBlacklistObj>;

const rsvpTagObj = {} satisfies RsvpTagDefaultArgs;
export type RsvpTag = RsvpTagGetPayload<typeof rsvpTagObj>;

/* endregion */

/*
const paymethodMappingObj =
  Prisma.validator<Prisma.StorePaymentMethodMappingDefaultArgs>()({
  include: { paymentMethod: true },
  });
export type StorePaymentMethodMapping =
  Prisma.StorePaymentMethodMappingGetPayload<typeof paymethodMappingObj>;

export const shipmethodMappingObj =
  Prisma.validator<Prisma.StoreShipMethodMappingDefaultArgs>()({
  include: { shippingMethod: true },
  });
export type StoreShipMethodMapping = Prisma.StoreShipMethodMappingGetPayload<
  typeof shipmethodMappingObj
>;

const storeObj = Prisma.validator<Prisma.StoreDefaultArgs>()({
  include: { storeShippingMethods: true, storePaymentMethods: true },
});
export type Store = Prisma.StoreGetPayload<typeof storeObj>;

const reviewObj = Prisma.validator<Prisma.ProductReviewDefaultArgs>()({
  include: {
  customer: true,
  },
});
export type ProductReview = Prisma.ProductReviewGetPayload<typeof revieObj>;
*/
