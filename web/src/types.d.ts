//import type { Product } from "prisma/prisma-client";
import { Prisma } from "prisma/prisma-client";

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

const platformSettingsObj =
	Prisma.validator<Prisma.PlatformSettingsDefaultArgs>()({});
export type PlatformSettings = Prisma.PlatformSettingsGetPayload<
	typeof platformSettingsObj
>;

const systemLogObj = Prisma.validator<Prisma.system_logDefaultArgs>()({});
export type SystemLog = Prisma.SystemLogGetPayload<typeof systemLogObj>;

const localeObj = Prisma.validator<Prisma.LocaleDefaultArgs>()({});
export type Locale = Prisma.LocaleGetPayload<typeof localeObj>;

const messageTemplateObj =
	Prisma.validator<Prisma.MessageTemplateDefaultArgs>()({
		include: {
			MessageTemplateLocalized: true,
		},
	});
export type MessageTemplate = Prisma.MessageTemplateGetPayload<
	typeof messageTemplateObj
>;

const messageTemplateLocalizedObj =
	Prisma.validator<Prisma.MessageTemplateLocalizedDefaultArgs>()({});
export type MessageTemplateLocalized =
	Prisma.MessageTemplateLocalizedGetPayload<typeof messageTemplateLocalizedObj>;

const emailQueueObj = Prisma.validator<Prisma.EmailQueueDefaultArgs>()({});
export type EmailQueue = Prisma.EmailQueueGetPayload<typeof emailQueueObj>;

export enum CartProductStatus {
	InProgress = 0, // customization is work-in-progress
	ReadyToCheckout = 1, //saved in cart, ready to checkout
}

const categoryObj = Prisma.validator<Prisma.CategoryDefaultArgs>()({
	include: {
		ProductCategories: true,
	},
});
export type Category = Prisma.CategoryGetPayload<typeof categoryObj>;

const paymethodMappingObj =
	Prisma.validator<Prisma.StorePaymentMethodMappingDefaultArgs>()({
		include: { PaymentMethod: true },
	});
export type StorePaymentMethodMapping =
	Prisma.StorePaymentMethodMappingGetPayload<typeof paymethodMappingObj>;

export const shipmethodMappingObj =
	Prisma.validator<Prisma.StoreShipMethodMappingDefaultArgs>()({
		include: { ShippingMethod: true },
	});
export type StoreShipMethodMapping = Prisma.StoreShipMethodMappingGetPayload<
	typeof shipmethodMappingObj
>;

const storeCategoryObj = Prisma.validator<Prisma.StoreDefaultArgs>()({
	include: {
		StoreShippingMethods,
		StorePaymentMethods,
		Categories: { include: { ProductCategories: true } },
	},
});
export type StoreWithProductNCategories = Prisma.StoreGetPayload<
	typeof storeCategoryObj
>;

const storeObj = Prisma.validator<Prisma.StoreDefaultArgs>()({
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
});
export type Store = Prisma.StoreGetPayload<typeof storeObj>;

const storeWithProductObj = Prisma.validator<Prisma.StoreDefaultArgs>()({
	include: {
		StoreFacilities: true,
		StoreShippingMethods,
		StorePaymentMethods,
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
});
export type StoreWithProducts = Prisma.StoreGetPayload<
	typeof storeWithProductObj
>;

const orderObj = Prisma.validator<Prisma.StoreOrderDefaultArgs>()({
	include: {
		Store: true,
		OrderNotes: true,
		OrderItemView: true,
		User: true,
		ShippingMethod: true,
		PaymentMethod: true,
	},
});
export type StoreOrder = Prisma.StoreOrderGetPayload<typeof orderObj>;

const prodCategoryObj = Prisma.validator<Prisma.ProductCategoriesDefaultArgs>()(
	{
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
	},
);
export type ProductCategories = Prisma.ProductCategoriesGetPayload<
	typeof prodCategoryObj
>;

const productObj = Prisma.validator<Prisma.ProductDefaultArgs>()({
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
});
export type Product = Prisma.ProductGetPayload<typeof productObj>;

const productOptionObj = Prisma.validator<Prisma.ProductOptionDefaultArgs>()({
	include: {
		ProductOptionSelections: true,
	},
});
export type ProductOption = Prisma.ProductOptionGetPayload<
	typeof productOptionObj
>;

const storeProductOptionTemplateObj =
	Prisma.validator<Prisma.StoreProductOptionTemplateDefaultArgs>()({
		include: {
			StoreProductOptionSelectionsTemplate: true,
		},
	});
export type StoreProductOptionTemplate =
	Prisma.StoreProductOptionTemplateGetPayload<
		typeof storeProductOptionTemplateObj
	>;

const userObj = Prisma.validator<Prisma.UserDefaultArgs>()({
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
});
export type User = Prisma.UserGetPayload<typeof userObj>;

const customerInviteObj = Prisma.validator<Prisma.CustomerInviteDefaultArgs>()({
	include: {
		User: true,
		Store: true,
		Inviter: true,
	},
});
export type CustomerInvite = Prisma.CustomerInviteGetPayload<
	typeof customerInviteObj
>;

const sysmsgObj = Prisma.validator<Prisma.SystemMessageDefaultArgs>()({});
export type SystemMessage = Prisma.SystemMessageGetPayload<typeof sysmsgObj>;

const FaqCategoryObj = Prisma.validator<Prisma.FaqCategoryDefaultArgs>()({
	include: {
		FAQ: true,
	},
});
export type FaqCategory = Prisma.FaqCategoryGetPayload<typeof FaqCategoryObj>;

const faqObj = Prisma.validator<Prisma.FaqDefaultArgs>()({
	include: {
		FaqCategory: true,
	},
});
export type Faq = Prisma.FaqGetPayload<typeof faqObj>;

const supportTicketObj = Prisma.validator<Prisma.SupportTicketDefaultArgs>()({
	include: {
		Sender: true,
	},
});
export type SupportTicket = Prisma.SupportTicketGetPayload<
	typeof supportTicketObj
>;

const notificationObj = Prisma.validator<Prisma.MessageQueueDefaultArgs>()({
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
});
export type MessageQueue = Prisma.MessageQueueGetPayload<
	typeof notificationObj
>;

const customerCreditObj = Prisma.validator<Prisma.CustomerCreditDefaultArgs>()({
	include: {
		User: true,
	},
});
export type CustomerCredit = Prisma.CustomerCreditGetPayload<
	typeof customerCreditObj
>;

const customerCreditLedgerObj =
	Prisma.validator<Prisma.CustomerCreditLedgerDefaultArgs>()({
		include: {
			Store: true,
			User: true,
			Creator: true,
			StoreOrder: true,
		},
	});
export type CustomerCreditLedger = Prisma.CustomerCreditLedgerGetPayload<
	typeof customerCreditLedgerObj
>;

const customerFiatLedgerObj =
	Prisma.validator<Prisma.CustomerFiatLedgerDefaultArgs>()({
		include: {
			Store: true,
			User: true,
			Creator: true,
			StoreOrder: true,
		},
	});
export type CustomerFiatLedger = Prisma.CustomerFiatLedgerGetPayload<
	typeof customerFiatLedgerObj
>;

const storeFacilityObj = Prisma.validator<Prisma.StoreFacilityDefaultArgs>()({
	include: {
		Store: true,
		Rsvp: true,
		FacilityPricingRules: true,
	},
});
export type StoreFacility = Prisma.StoreFacilityGetPayload<
	typeof storeFacilityObj
>;

const serviceStaffObj = Prisma.validator<Prisma.ServiceStaffDefaultArgs>()({
	include: {
		Store: true,
		User: true,
	},
});
export type ServiceStaff = Prisma.ServiceStaffGetPayload<
	typeof serviceStaffObj
>;

const rsvpObj = Prisma.validator<Prisma.RsvpDefaultArgs>()({
	include: {
		Store: true,
		Customer: true,
		Order: true,
		Facility: true,
		FacilityPricingRule: true,
		CreatedBy: true,
		ServiceStaff: {
			include: {
				User: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		},
	},
});
export type Rsvp = Prisma.RsvpGetPayload<typeof rsvpObj>;

const storeSettingsObj = Prisma.validator<Prisma.StoreSettingsDefaultArgs>()(
	{},
);
export type StoreSettings = Prisma.StoreSettingsGetPayload<
	typeof storeSettingsObj
>;

const rsvpSettingsObj = Prisma.validator<Prisma.RsvpSettingsDefaultArgs>()({});
export type RsvpSettings = Prisma.RsvpSettingsGetPayload<
	typeof rsvpSettingsObj
>;

const rsvpBlacklistObj = Prisma.validator<Prisma.RsvpBlacklistDefaultArgs>()(
	{},
);
export type RsvpBlacklist = Prisma.RsvpBlacklistGetPayload<
	typeof rsvpBlacklistObj
>;

const rsvpTagObj = Prisma.validator<Prisma.RsvpTagDefaultArgs>()({});
export type RsvpTag = Prisma.RsvpTagGetPayload<typeof rsvpTagObj>;

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
