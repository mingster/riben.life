/*
  Warnings:

  - You are about to drop the column `optionId` on the `ProductOption` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `ProductOptionSelections` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `StoreProductOptionSelectionsTemplate` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[productId,optionName]` on the table `ProductOption` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[optionId,name]` on the table `ProductOptionSelections` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[optionId,name]` on the table `StoreProductOptionSelectionsTemplate` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[storeId,optionName]` on the table `StoreProductOptionTemplate` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tableName]` on the table `StoreTables` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[storeId]` on the table `Subscription` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `productName` to the `OrderItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `storeId` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ProductOption_optionName_key";

-- DropIndex
DROP INDEX "ProductOptionSelections_name_key";

-- DropIndex
DROP INDEX "StoreProductOptionSelectionsTemplate_name_key";

-- DropIndex
DROP INDEX "StoreProductOptionTemplate_optionName_key";

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "productName" TEXT NOT NULL,
ADD COLUMN     "variantCosts" TEXT,
ADD COLUMN     "variants" TEXT,
ALTER COLUMN "quantity" DROP DEFAULT,
ALTER COLUMN "unitPrice" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "currency" SET DEFAULT 'twd',
ALTER COLUMN "useOption" SET DEFAULT true;

-- AlterTable
ALTER TABLE "ProductOption" DROP COLUMN "optionId",
ADD COLUMN     "minQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "minSelection" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "isRequired" SET DEFAULT false,
ALTER COLUMN "maxSelection" SET DEFAULT 0,
ALTER COLUMN "maxQuantity" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "ProductOptionSelections" DROP COLUMN "quantity",
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ShippingMethod" ALTER COLUMN "currencyId" SET DEFAULT 'twd';

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "LINE_PAY_ID" TEXT,
ADD COLUMN     "LINE_PAY_SECRET" TEXT,
ADD COLUMN     "STRIPE_SECRET_KEY" TEXT,
ADD COLUMN     "defaultTimezone" INTEGER NOT NULL DEFAULT -8,
ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "requirePrepaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requireSeating" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rsvpPrepaid" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "defaultCurrency" SET DEFAULT 'usd';

-- AlterTable
ALTER TABLE "StoreOrder" ADD COLUMN     "paidDate" TIMESTAMP(3),
ADD COLUMN     "tableId" TEXT,
ALTER COLUMN "orderNum" DROP NOT NULL,
ALTER COLUMN "currency" SET DEFAULT 'twd';

-- AlterTable
ALTER TABLE "StoreProductOptionSelectionsTemplate" DROP COLUMN "quantity",
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "StoreProductOptionTemplate" ADD COLUMN     "minQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "minSelection" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "isRequired" SET DEFAULT false,
ALTER COLUMN "maxSelection" SET DEFAULT 0,
ALTER COLUMN "maxQuantity" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "StoreTables" ADD COLUMN     "capacity" INTEGER NOT NULL DEFAULT 2;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "storeId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "SubscriptionPayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "isPaid" BOOLEAN NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'twd',
    "checkoutAttributes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rsvp" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "userId" TEXT,
    "orderId" TEXT,
    "tableId" TEXT,
    "numOfAdult" INTEGER NOT NULL DEFAULT 2,
    "numOfChild" INTEGER NOT NULL DEFAULT 0,
    "rsvpTime" TIMESTAMP(3) NOT NULL,
    "arriveTime" TIMESTAMP(3) NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rsvp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubscriptionPayment_userId_idx" ON "SubscriptionPayment"("userId");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_storeId_idx" ON "SubscriptionPayment"("storeId");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_checkoutAttributes_idx" ON "SubscriptionPayment"("checkoutAttributes");

-- CreateIndex
CREATE INDEX "Rsvp_storeId_idx" ON "Rsvp"("storeId");

-- CreateIndex
CREATE INDEX "Rsvp_userId_idx" ON "Rsvp"("userId");

-- CreateIndex
CREATE INDEX "Rsvp_orderId_idx" ON "Rsvp"("orderId");

-- CreateIndex
CREATE INDEX "Rsvp_tableId_idx" ON "Rsvp"("tableId");

-- CreateIndex
CREATE INDEX "Category_name_idx" ON "Category"("name");

-- CreateIndex
CREATE INDEX "OrderNote_updatedAt_idx" ON "OrderNote"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductOption_productId_optionName_key" ON "ProductOption"("productId", "optionName");

-- CreateIndex
CREATE UNIQUE INDEX "ProductOptionSelections_optionId_name_key" ON "ProductOptionSelections"("optionId", "name");

-- CreateIndex
CREATE INDEX "Store_defaultCountry_idx" ON "Store"("defaultCountry");

-- CreateIndex
CREATE INDEX "Store_defaultCurrency_idx" ON "Store"("defaultCurrency");

-- CreateIndex
CREATE INDEX "Store_level_idx" ON "Store"("level");

-- CreateIndex
CREATE INDEX "Store_customDomain_idx" ON "Store"("customDomain");

-- CreateIndex
CREATE INDEX "StoreOrder_isPaid_idx" ON "StoreOrder"("isPaid");

-- CreateIndex
CREATE INDEX "StoreOrder_paidDate_idx" ON "StoreOrder"("paidDate");

-- CreateIndex
CREATE INDEX "StoreOrder_currency_idx" ON "StoreOrder"("currency");

-- CreateIndex
CREATE INDEX "StoreOrder_updatedAt_idx" ON "StoreOrder"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StoreProductOptionSelectionsTemplate_optionId_name_key" ON "StoreProductOptionSelectionsTemplate"("optionId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "StoreProductOptionTemplate_storeId_optionName_key" ON "StoreProductOptionTemplate"("storeId", "optionName");

-- CreateIndex
CREATE UNIQUE INDEX "StoreTables_tableName_key" ON "StoreTables"("tableName");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_storeId_key" ON "Subscription"("storeId");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_storeId_idx" ON "Subscription"("storeId");
