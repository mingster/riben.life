import type { Currency } from "@prisma/client";

export interface CurrencyColumn {
	id: string;
	name: string;
	symbol: string | null;
	symbolNative: string;
	demonym: string;
	ISOdigits: number | null;
	ISOnum: number | null;
	decimals: number | null;
	majorPlural: string | null;
	majorSingle: string | null;
	minorPlural: string | null;
	minorSingle: string | null;
	numToBasic: number | null;
}

export const mapCurrencyToColumn = (currency: Currency): CurrencyColumn => ({
	id: currency.id,
	name: currency.name,
	symbol: currency.symbol,
	symbolNative: currency.symbolNative,
	demonym: currency.demonym,
	ISOdigits: currency.ISOdigits,
	ISOnum: currency.ISOnum,
	decimals: currency.decimals,
	majorPlural: currency.majorPlural,
	majorSingle: currency.majorSingle,
	minorPlural: currency.minorPlural,
	minorSingle: currency.minorSingle,
	numToBasic: currency.numToBasic,
});
