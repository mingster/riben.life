import type { DefaultSession, DefaultUser } from "next-auth";
import type { Notification } from "prisma/prisma-client";
//import type { Product } from "prisma/prisma-client";
import { Prisma } from "prisma/prisma-client";

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

//this is for customized product...
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

const storeObj = Prisma.validator<Prisma.StoreDefaultArgs>()({
  include: {
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
  },
});
export type Store = Prisma.StoreGetPayload<typeof storeObj>;

const storeWithProductObj = Prisma.validator<Prisma.StoreDefaultArgs>()({
  include: {
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
    Session: true,
    Orders: true,
    Account: true,
    Addresses: true,
    //NotificationTo: true,
  },
});
export type User = Prisma.UserGetPayload<typeof userObj>;

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

const notificationObj = Prisma.validator<Prisma.StoreNotificationDefaultArgs>()(
  {
    include: {
      Sender: true,
    },
  },
);
export type StoreNotification = Prisma.StoreNotificationGetPayload<
  typeof notificationObj
>;

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
