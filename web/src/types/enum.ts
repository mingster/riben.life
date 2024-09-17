export type GeneralNVType = {
  value: number;
  label: string;
};
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

export enum TicketStatus {
  Open = 0,
  Active = 10,
  Replied = 11,
  Closed = 20,
  Postponed = 30,
  Archived = 40,
  Merged = 50,
}

export enum OrderStatus {
  Pending = 10,
  Processing = 20,
  InShipping = 30,
  Completed = 40,
  Refund = 50,
  Cancelled = 100,
}

/*
ReturnAuthorized = 30,
	ItemRepaired = 40,
	ItemRefunded = 50,
	RequestRejected = 60,
	Cancelled = 70,
	*/
export enum PaymentStatus {
  Pending = 10,
  SelfPickup = 11,
  Authorized = 20,
  Paid = 30,
  PartiallyRefunded = 40,
  Refunded = 50,
  Voided = 60,
}

export enum ShippingMethod {
  Digital = 10,
  SelfPickup = 20,
  FlatRate = 30,
  LocalDelivery = 40,
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

export enum PaymentMethod {
  Stripe = 10,
  PayPal = 20,
}
