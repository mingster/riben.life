import { describe, expect, it } from "bun:test";
import { translateRsvpStatusForNotification } from "../translate-rsvp-status-for-notification";
import { RsvpStatus } from "@/types/enum";

describe("translateRsvpStatusForNotification", () => {
	it("localizes English labels to tw", () => {
		expect(
			translateRsvpStatusForNotification("tw", "Confirmed by Customer"),
		).toBe("客戶已確認");
		expect(translateRsvpStatusForNotification("tw", "Ready")).toBe("預約中");
	});

	it("localizes numeric codes to tw", () => {
		expect(
			translateRsvpStatusForNotification("tw", RsvpStatus.ConfirmedByCustomer),
		).toBe("客戶已確認");
		expect(translateRsvpStatusForNotification("tw", RsvpStatus.Ready)).toBe(
			"預約中",
		);
	});

	it("passes through unknown string labels", () => {
		expect(
			translateRsvpStatusForNotification("tw", "Totally Unknown Status"),
		).toBe("Totally Unknown Status");
	});

	it("returns empty for null or blank", () => {
		expect(translateRsvpStatusForNotification("tw", null)).toBe("");
		expect(translateRsvpStatusForNotification("tw", "")).toBe("");
		expect(translateRsvpStatusForNotification("tw", "   ")).toBe("");
	});
});
