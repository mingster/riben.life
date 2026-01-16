export type StringNVType = {
	value: string;
	label: string;
};

export type GeneralNVType = {
	value: number;
	label: string;
};

export enum TicketPriority {
	Low = 1,
	Medium = 2,
	High = 3,
}

export enum TicketStatus {
	Open = 0,
	Active = 10,
	Replied = 11,
	Closed = 20,
	Postponed = 30,
	Archived = 40,
	Merged = 50,
}

export enum ProductStatus {
	Draft = 0,
	Published = 1,
	Archived = 20,
	Deleted = 30,
}

export const ProductStatuses: GeneralNVType[] = [
	{
		value: ProductStatus.Draft,
		label: "Draft",
	},
	{
		value: ProductStatus.Published,
		label: "Published",
	},
	{
		value: ProductStatus.Archived,
		label: "Archived",
	},
];

export enum PayoutScheduleNum {
	Manual = 0,
	Auto_Daily = 1,
	Auto_Weekly = 2,
	Auto_Monthly = 3,
}

export const PayoutSchedule: GeneralNVType[] = [
	{
		value: PayoutScheduleNum.Manual,
		label: "Manual",
	},
	{
		value: PayoutScheduleNum.Auto_Daily,
		label: "Auto_Daily",
	},
	{
		value: PayoutScheduleNum.Auto_Weekly,
		label: "Auto_Weekly",
	},
	{
		value: PayoutScheduleNum.Auto_Monthly,
		label: "Auto_Monthly",
	},
];

export const PageAction = {
	create: "Create",
	modify: "Modify",
	delete: "Delete",
} as const;

export type SubscriptionForUI = {
	id: string;
	customer: string;
	priceId: string;
	productName: string;
	status: string;
	start_date: Date;
	canceled_at: Date | null;
};

export enum SubscriptionStatus {
	Inactive = 0,
	Active = 1,
	Cancelled = 20,
}

export enum OrderStatus {
	Pending = 10,
	Processing = 20,
	InShipping = 30,
	Completed = 40, //store completed its process. Awaiting customer to confirmed
	Confirmed = 50, //customer confirmed the order
	Refunded = 60,
	Voided = 90,
	//Cancelled = 100,
}

/*
ReturnAuthorized = 30,
  ItemRepaired = 40,
  ItemRefunded = 50,
  RequestRejected = 60,
  Cancelled = 70,
  */

export enum StoreLevel {
	Free = 1,
	Pro = 2,
	Multi = 3,
}

export enum PaymentStatus {
	Pending = 10,
	SelfPickup = 11,
	Authorized = 20,
	Paid = 30,
	PartiallyRefunded = 40,
	Refunded = 50,
	Voided = 60,
}

export enum StoreLedgerType {
	HoldByPlatform = 0, // 代收 - payment processed by platform. the fiat is store's revenue that we need to pay out at request.
	StorePaymentProvider = 1, // Store has its own payment processor. no payout needed.
}

export enum CustomerCreditLedgerType {
	Topup = "TOPUP", // Customer or store operator adds credit (via payment)
	Bonus = "BONUS", // Bonus credit awarded based on bonus rules
	Hold = "HOLD", // When customer make a reservation, the credit is held. As the reservation completed, the credit is spent.
	Spend = "SPEND", // Credit used for purchase/order
	Refund = "REFUND", // Credit refunded (e.g., order cancellation)
	Adjustment = "ADJUSTMENT", // Manual adjustment by store operator
}

export enum ShippingStatus {
	ShippigNotRequired = 0,
	NotYetShipped = 10,
	PartiallyShipped = 20,
	Shipped = 30,
	Delivered = 40,
}

export enum ReturnStatus {
	None = 0,
	Pending = 10,
	Received = 20,
	ReturnAuthorized = 30,
	ItemRepaired = 40,
	ItemRefunded = 50,
	RequestRejected = 60,
	Cancelled = 70,
}

export enum RsvpStatus {
	Pending = 0, //尚未付款
	ReadyToConfirm = 10, //待確認
	Ready = 40, //預約中 ready for service
	Completed = 50, //已完成 checkout
	Cancelled = 60, //已取消
	NoShow = 70, //未到
}

export const MemberRole = {
	customer: "customer",
	owner: "owner",
	staff: "staff",
	storeAdmin: "storeAdmin",
} as const;

// Role enum values for client-side use (matches Prisma schema)
// Server components should use Role from @prisma/client
export const Role = {
	user: "user",
	owner: "owner",
	staff: "staff",
	storeAdmin: "storeAdmin",
	admin: "admin",
} as const;
