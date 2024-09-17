-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'OWNER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "username" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "role" "Role" DEFAULT 'USER',
    "stripeCustomerId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "refresh_token_expires_in" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Authenticator" (
    "credentialID" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "credentialPublicKey" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    "credentialDeviceType" TEXT NOT NULL,
    "credentialBackedUp" BOOLEAN NOT NULL,
    "transports" TEXT,

    CONSTRAINT "Authenticator_pkey" PRIMARY KEY ("userId","credentialID")
);

-- CreateTable
CREATE TABLE "Country" (
    "name" TEXT NOT NULL,
    "unCode" VARCHAR(3) NOT NULL,
    "allowBilling" BOOLEAN NOT NULL DEFAULT false,
    "allowShipping" BOOLEAN NOT NULL DEFAULT false,
    "allowInStore" BOOLEAN NOT NULL DEFAULT false,
    "alpha3" VARCHAR(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("alpha3")
);

-- CreateTable
CREATE TABLE "Currency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT,
    "ISOdigits" INTEGER,
    "ISOnum" INTEGER,
    "decimals" INTEGER,
    "demonym" TEXT NOT NULL,
    "majorPlural" TEXT,
    "majorSingle" TEXT,
    "minorPlural" TEXT,
    "minorSingle" TEXT,
    "numToBasic" INTEGER,
    "symbolNative" TEXT NOT NULL,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Locale" (
    "id" VARCHAR(5) NOT NULL,
    "name" TEXT NOT NULL,
    "lng" TEXT NOT NULL,
    "defaultCurrencyId" TEXT NOT NULL,

    CONSTRAINT "Locale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "company" TEXT,
    "countryId" TEXT NOT NULL,
    "streetLine1" TEXT NOT NULL,
    "streetLine2" TEXT,
    "city" TEXT NOT NULL,
    "district" TEXT,
    "province" TEXT,
    "postalCode" TEXT,
    "phoneNumber" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "type" TEXT,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "payUrl" TEXT NOT NULL DEFAULT '',
    "priceDescr" TEXT NOT NULL DEFAULT '',
    "fee" DECIMAL(65,30) NOT NULL DEFAULT 0.029,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorePaymentMethodMapping" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "methodId" TEXT NOT NULL,
    "paymentDisplayName" TEXT,

    CONSTRAINT "StorePaymentMethodMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingMethod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "basic_price" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currencyId" TEXT NOT NULL DEFAULT 'USD',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "shipRequried" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingMethodPrice" (
    "id" TEXT NOT NULL,
    "methodId" TEXT NOT NULL,
    "dimension_length" INTEGER NOT NULL,
    "dimension_width" INTEGER NOT NULL,
    "dimension_height" INTEGER NOT NULL,
    "dimension_weight" INTEGER NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "ShippingMethodPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreShipMethodMapping" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "methodId" TEXT NOT NULL,

    CONSTRAINT "StoreShipMethodMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "shippingMethodId" TEXT NOT NULL,
    "trackingNumber" TEXT,
    "trackingUrl" TEXT,
    "shippingCost" DECIMAL(65,30) NOT NULL,
    "shippingStatus" INTEGER NOT NULL DEFAULT 10,
    "totalWeight" DECIMAL(65,30),
    "shippedDate" TIMESTAMP(3),
    "deliveryDate" TIMESTAMP(3),
    "readyForPickupDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiration" TIMESTAMP(3) NOT NULL,
    "status" INTEGER NOT NULL,
    "subscriptionInvoiceNumber" TEXT,
    "billingProvider" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "customDomain" TEXT,
    "defaultCountry" TEXT NOT NULL DEFAULT 'USA',
    "defaultCurrency" TEXT NOT NULL DEFAULT 'USD',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "defaultLocale" TEXT NOT NULL DEFAULT 'en',
    "autoAcceptOrder" BOOLEAN NOT NULL DEFAULT true,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "acceptAnonymousOrder" BOOLEAN NOT NULL DEFAULT true,
    "acceptReservation" BOOLEAN NOT NULL DEFAULT true,
    "useBusinessHours" BOOLEAN NOT NULL DEFAULT true,
    "payoutSchedule" INTEGER NOT NULL DEFAULT 0,
    "bankCode" TEXT,
    "bankAccount" TEXT,
    "bankAccountName" TEXT,
    "logo" TEXT,
    "logoPublicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreTables" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,

    CONSTRAINT "StoreTables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreAnnouncement" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImages" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "imgPublicId" TEXT NOT NULL,

    CONSTRAINT "ProductImages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "status" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "price" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "useOption" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreProductOptionTemplate" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "optionName" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL,
    "isMultiple" BOOLEAN NOT NULL DEFAULT false,
    "maxSelection" INTEGER NOT NULL DEFAULT 1,
    "allowQuantity" BOOLEAN NOT NULL DEFAULT false,
    "maxQuantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "StoreProductOptionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreProductOptionSelectionsTemplate" (
    "id" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "StoreProductOptionSelectionsTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductOption" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "optionName" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL,
    "isMultiple" BOOLEAN NOT NULL DEFAULT false,
    "maxSelection" INTEGER NOT NULL DEFAULT 1,
    "allowQuantity" BOOLEAN NOT NULL DEFAULT false,
    "maxQuantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ProductOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductOptionSelections" (
    "id" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ProductOptionSelections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategories" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "ProductCategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAttribute" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "interval" INTEGER,
    "intervalCount" INTEGER,
    "trialPeriodDays" INTEGER,
    "stripePriceId" TEXT,
    "isBrandNew" BOOLEAN NOT NULL DEFAULT true,
    "isShipRequired" BOOLEAN NOT NULL DEFAULT false,
    "isFreeShipping" BOOLEAN NOT NULL DEFAULT false,
    "additionalShipCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "displayStockAvailability" BOOLEAN NOT NULL DEFAULT false,
    "displayStockQuantity" BOOLEAN NOT NULL DEFAULT false,
    "allowBackOrder" BOOLEAN NOT NULL DEFAULT false,
    "orderMinQuantity" INTEGER NOT NULL DEFAULT 1,
    "orderMaxQuantity" INTEGER NOT NULL DEFAULT 0,
    "disableBuyButton" BOOLEAN NOT NULL DEFAULT false,
    "weight" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "height" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "width" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "availableStartDate" TIMESTAMP(3),
    "availableEndDate" TIMESTAMP(3),
    "mfgPartNumber" TEXT,

    CONSTRAINT "ProductAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreOrder" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "userId" TEXT,
    "orderNum" SERIAL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "checkoutAttributes" TEXT NOT NULL DEFAULT '',
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "currencyRate" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "discount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "orderTax" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "paymentMethodId" TEXT,
    "paymentStatus" INTEGER NOT NULL DEFAULT 10,
    "refundAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "returnStatus" INTEGER NOT NULL DEFAULT 0,
    "shippingMethodId" TEXT NOT NULL,
    "shippingAddress" TEXT NOT NULL DEFAULT '',
    "shippingCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "shippingStatus" INTEGER NOT NULL DEFAULT 10,
    "taxRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "checkoutRef" TEXT NOT NULL DEFAULT '',
    "orderStatus" INTEGER NOT NULL DEFAULT 10,
    "paymentCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "orderTotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitDiscount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "unitPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderNote" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "displayToCustomer" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaqCategory" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "FaqCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faq" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemMessage" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreNotification" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipentId" TEXT NOT NULL,
    "storeId" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sendTries" INTEGER NOT NULL DEFAULT 0,
    "sentOn" TIMESTAMP(3),
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isDeletedByAuthor" BOOLEAN NOT NULL DEFAULT false,
    "isDeletedByRecipient" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "StoreNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueuedEmail" (
    "id" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "from" TEXT NOT NULL,
    "fromName" TEXT NOT NULL DEFAULT '',
    "to" TEXT NOT NULL,
    "toName" TEXT NOT NULL DEFAULT '',
    "cc" TEXT NOT NULL DEFAULT '',
    "bcc" TEXT NOT NULL DEFAULT '',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sendTries" INTEGER NOT NULL DEFAULT 0,
    "sentOn" TIMESTAMP(3),

    CONSTRAINT "QueuedEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipentId" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_userId_key" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Authenticator_credentialID_key" ON "Authenticator"("credentialID");

-- CreateIndex
CREATE UNIQUE INDEX "Country_unCode_key" ON "Country"("unCode");

-- CreateIndex
CREATE UNIQUE INDEX "Country_alpha3_key" ON "Country"("alpha3");

-- CreateIndex
CREATE INDEX "Country_name_idx" ON "Country"("name");

-- CreateIndex
CREATE INDEX "Country_alpha3_idx" ON "Country"("alpha3");

-- CreateIndex
CREATE UNIQUE INDEX "Currency_id_key" ON "Currency"("id");

-- CreateIndex
CREATE INDEX "Currency_name_idx" ON "Currency"("name");

-- CreateIndex
CREATE INDEX "Currency_demonym_idx" ON "Currency"("demonym");

-- CreateIndex
CREATE INDEX "Currency_symbol_idx" ON "Currency"("symbol");

-- CreateIndex
CREATE INDEX "Currency_symbolNative_idx" ON "Currency"("symbolNative");

-- CreateIndex
CREATE UNIQUE INDEX "Locale_id_key" ON "Locale"("id");

-- CreateIndex
CREATE INDEX "Locale_id_idx" ON "Locale"("id");

-- CreateIndex
CREATE INDEX "Locale_name_idx" ON "Locale"("name");

-- CreateIndex
CREATE INDEX "Address_userId_idx" ON "Address"("userId");

-- CreateIndex
CREATE INDEX "Address_countryId_idx" ON "Address"("countryId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_name_key" ON "PaymentMethod"("name");

-- CreateIndex
CREATE INDEX "StorePaymentMethodMapping_storeId_idx" ON "StorePaymentMethodMapping"("storeId");

-- CreateIndex
CREATE INDEX "StorePaymentMethodMapping_methodId_idx" ON "StorePaymentMethodMapping"("methodId");

-- CreateIndex
CREATE UNIQUE INDEX "StorePaymentMethodMapping_storeId_methodId_key" ON "StorePaymentMethodMapping"("storeId", "methodId");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingMethod_name_key" ON "ShippingMethod"("name");

-- CreateIndex
CREATE INDEX "ShippingMethod_name_idx" ON "ShippingMethod"("name");

-- CreateIndex
CREATE INDEX "ShippingMethod_currencyId_idx" ON "ShippingMethod"("currencyId");

-- CreateIndex
CREATE INDEX "ShippingMethodPrice_methodId_idx" ON "ShippingMethodPrice"("methodId");

-- CreateIndex
CREATE INDEX "StoreShipMethodMapping_storeId_idx" ON "StoreShipMethodMapping"("storeId");

-- CreateIndex
CREATE INDEX "StoreShipMethodMapping_methodId_idx" ON "StoreShipMethodMapping"("methodId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreShipMethodMapping_storeId_methodId_key" ON "StoreShipMethodMapping"("storeId", "methodId");

-- CreateIndex
CREATE INDEX "Shipment_orderId_idx" ON "Shipment"("orderId");

-- CreateIndex
CREATE INDEX "Shipment_shippingMethodId_idx" ON "Shipment"("shippingMethodId");

-- CreateIndex
CREATE UNIQUE INDEX "Store_customDomain_key" ON "Store"("customDomain");

-- CreateIndex
CREATE INDEX "Store_ownerId_idx" ON "Store"("ownerId");

-- CreateIndex
CREATE INDEX "Store_name_idx" ON "Store"("name");

-- CreateIndex
CREATE INDEX "StoreTables_storeId_idx" ON "StoreTables"("storeId");

-- CreateIndex
CREATE INDEX "StoreTables_tableName_idx" ON "StoreTables"("tableName");

-- CreateIndex
CREATE INDEX "StoreAnnouncement_storeId_idx" ON "StoreAnnouncement"("storeId");

-- CreateIndex
CREATE INDEX "StoreAnnouncement_updatedAt_idx" ON "StoreAnnouncement"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductImages_url_key" ON "ProductImages"("url");

-- CreateIndex
CREATE UNIQUE INDEX "ProductImages_imgPublicId_key" ON "ProductImages"("imgPublicId");

-- CreateIndex
CREATE INDEX "ProductImages_url_idx" ON "ProductImages"("url");

-- CreateIndex
CREATE INDEX "ProductImages_imgPublicId_idx" ON "ProductImages"("imgPublicId");

-- CreateIndex
CREATE INDEX "ProductImages_productId_idx" ON "ProductImages"("productId");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE INDEX "Product_storeId_idx" ON "Product"("storeId");

-- CreateIndex
CREATE INDEX "Product_isFeatured_idx" ON "Product"("isFeatured");

-- CreateIndex
CREATE INDEX "Product_status_idx" ON "Product"("status");

-- CreateIndex
CREATE INDEX "StoreProductOptionTemplate_storeId_idx" ON "StoreProductOptionTemplate"("storeId");

-- CreateIndex
CREATE INDEX "StoreProductOptionTemplate_optionName_idx" ON "StoreProductOptionTemplate"("optionName");

-- CreateIndex
CREATE UNIQUE INDEX "StoreProductOptionTemplate_optionName_key" ON "StoreProductOptionTemplate"("optionName");

-- CreateIndex
CREATE INDEX "StoreProductOptionSelectionsTemplate_optionId_idx" ON "StoreProductOptionSelectionsTemplate"("optionId");

-- CreateIndex
CREATE INDEX "StoreProductOptionSelectionsTemplate_name_idx" ON "StoreProductOptionSelectionsTemplate"("name");

-- CreateIndex
CREATE UNIQUE INDEX "StoreProductOptionSelectionsTemplate_name_key" ON "StoreProductOptionSelectionsTemplate"("name");

-- CreateIndex
CREATE INDEX "ProductOption_productId_idx" ON "ProductOption"("productId");

-- CreateIndex
CREATE INDEX "ProductOption_optionName_idx" ON "ProductOption"("optionName");

-- CreateIndex
CREATE UNIQUE INDEX "ProductOption_optionName_key" ON "ProductOption"("optionName");

-- CreateIndex
CREATE INDEX "ProductOptionSelections_optionId_idx" ON "ProductOptionSelections"("optionId");

-- CreateIndex
CREATE INDEX "ProductOptionSelections_name_idx" ON "ProductOptionSelections"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductOptionSelections_name_key" ON "ProductOptionSelections"("name");

-- CreateIndex
CREATE INDEX "ProductCategories_categoryId_idx" ON "ProductCategories"("categoryId");

-- CreateIndex
CREATE INDEX "ProductCategories_productId_idx" ON "ProductCategories"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategories_categoryId_productId_key" ON "ProductCategories"("categoryId", "productId");

-- CreateIndex
CREATE INDEX "Category_storeId_idx" ON "Category"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAttribute_productId_key" ON "ProductAttribute"("productId");

-- CreateIndex
CREATE INDEX "ProductAttribute_productId_idx" ON "ProductAttribute"("productId");

-- CreateIndex
CREATE INDEX "StoreOrder_userId_idx" ON "StoreOrder"("userId");

-- CreateIndex
CREATE INDEX "StoreOrder_paymentMethodId_idx" ON "StoreOrder"("paymentMethodId");

-- CreateIndex
CREATE INDEX "StoreOrder_paymentStatus_idx" ON "StoreOrder"("paymentStatus");

-- CreateIndex
CREATE INDEX "StoreOrder_returnStatus_idx" ON "StoreOrder"("returnStatus");

-- CreateIndex
CREATE INDEX "StoreOrder_shippingMethodId_idx" ON "StoreOrder"("shippingMethodId");

-- CreateIndex
CREATE INDEX "StoreOrder_shippingStatus_idx" ON "StoreOrder"("shippingStatus");

-- CreateIndex
CREATE INDEX "StoreOrder_storeId_idx" ON "StoreOrder"("storeId");

-- CreateIndex
CREATE INDEX "StoreOrder_checkoutAttributes_idx" ON "StoreOrder"("checkoutAttributes");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "OrderNote_orderId_idx" ON "OrderNote"("orderId");

-- CreateIndex
CREATE INDEX "FaqCategory_storeId_idx" ON "FaqCategory"("storeId");

-- CreateIndex
CREATE INDEX "FaqCategory_name_idx" ON "FaqCategory"("name");

-- CreateIndex
CREATE INDEX "Faq_categoryId_idx" ON "Faq"("categoryId");

-- CreateIndex
CREATE INDEX "Faq_sortOrder_idx" ON "Faq"("sortOrder");

-- CreateIndex
CREATE INDEX "SystemMessage_updatedAt_idx" ON "SystemMessage"("updatedAt");

-- CreateIndex
CREATE INDEX "StoreNotification_storeId_idx" ON "StoreNotification"("storeId");

-- CreateIndex
CREATE INDEX "StoreNotification_senderId_idx" ON "StoreNotification"("senderId");

-- CreateIndex
CREATE INDEX "StoreNotification_recipentId_idx" ON "StoreNotification"("recipentId");

-- CreateIndex
CREATE INDEX "StoreNotification_updatedAt_idx" ON "StoreNotification"("updatedAt");

-- CreateIndex
CREATE INDEX "QueuedEmail_sendTries_idx" ON "QueuedEmail"("sendTries");

-- CreateIndex
CREATE INDEX "QueuedEmail_createdOn_idx" ON "QueuedEmail"("createdOn");

-- CreateIndex
CREATE INDEX "QueuedEmail_from_idx" ON "QueuedEmail"("from");

-- CreateIndex
CREATE INDEX "QueuedEmail_to_idx" ON "QueuedEmail"("to");

-- CreateIndex
CREATE INDEX "SupportTicket_updatedAt_idx" ON "SupportTicket"("updatedAt");

-- CreateIndex
CREATE INDEX "SupportTicket_threadId_idx" ON "SupportTicket"("threadId");

-- CreateIndex
CREATE INDEX "SupportTicket_senderId_idx" ON "SupportTicket"("senderId");

-- CreateIndex
CREATE INDEX "SupportTicket_recipentId_idx" ON "SupportTicket"("recipentId");

-- CreateIndex
CREATE INDEX "SupportTicket_storeId_idx" ON "SupportTicket"("storeId");
