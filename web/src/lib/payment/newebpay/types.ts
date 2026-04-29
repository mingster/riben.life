export interface NewebPayCredentials {
	merchantId: string;
	hashKey: string;
	hashIV: string;
}

export interface NewebPayMpgTradeInfoInput {
	MerchantID: string;
	RespondType: "JSON" | "String";
	TimeStamp: string;
	Version: string;
	MerchantOrderNo: string;
	Amt: number;
	ItemDesc: string;
	ReturnURL?: string;
	NotifyURL?: string;
	ClientBackURL?: string;
	Email?: string;
	EmailModify?: 0 | 1;
	LangType?: "zh-tw" | "en" | "jp";
	CREDIT?: 0 | 1;
}

export interface NewebPayMpgFormPayload {
	MerchantID: string;
	TradeInfo: string;
	TradeSha: string;
	Version: string;
}

export interface NewebPayCallbackEnvelope {
	Status: string;
	MerchantID: string;
	TradeInfo: string;
	TradeSha: string;
	Version: string;
}

export interface NewebPayCallbackResult {
	Status: string;
	Message?: string;
	Result?: string;
}

export interface NewebPayPaymentResult {
	MerchantID?: string;
	Amt?: string | number;
	TradeNo?: string;
	MerchantOrderNo?: string;
	PaymentType?: string;
	RespondCode?: string;
	Auth?: string;
	CheckCode?: string;
	PayTime?: string;
	[extra: string]: string | number | undefined;
}
