"use server";

import { storeActionClient } from "@/utils/actions/safe-action";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

const schema = z.object({
	text: z.string().min(1),
	targetLocaleId: z.string().min(1),
	sourceLocaleId: z.string().min(1),
});

const LOCALE_NAMES: Record<string, string> = {
	en: "English",
	tw: "Traditional Chinese (Taiwan)",
	jp: "Japanese",
	zh: "Simplified Chinese",
	ko: "Korean",
};

export const translateFaqContentAction = storeActionClient
	.metadata({ name: "translateFaqContent" })
	.schema(schema)
	.action(async ({ parsedInput: { text, targetLocaleId, sourceLocaleId } }) => {
		const apiKey = process.env.GOOGLE_AI_API_KEY;
		if (!apiKey) throw new Error("GOOGLE_AI_API_KEY is not configured.");
		const modelName = process.env.GOOGLE_AI_MODEL;
		if (!modelName) throw new Error("GOOGLE_AI_MODEL is not configured.");

		const targetLang = LOCALE_NAMES[targetLocaleId] ?? targetLocaleId;
		const sourceLang = LOCALE_NAMES[sourceLocaleId] ?? sourceLocaleId;

		const genAI = new GoogleGenerativeAI(apiKey);
		const model = genAI.getGenerativeModel({ model: modelName });

		const prompt = `Translate the following text from ${sourceLang} to ${targetLang}. Return only the translated text with no explanation or surrounding quotes.\n\n${text}`;

		const result = await model.generateContent(prompt);
		return { translatedText: result.response.text().trim() };
	});
