//import { escape } from "lodash";

export const phasePlaintextToHtm = (plaintext: string) => {
	// HTML encode
	//let htmMessage = escape(plaintext);
	let htmMessage = plaintext;

	// Normalize line breaks to <p>
	htmMessage = htmMessage.replace(/\r\n/g, "<p>");
	htmMessage = htmMessage.replace(/\n/g, "<p>");

	htmMessage = htmMessage.replace(/\r/g, "<br/>");

	// Replace double spaces with space + &nbsp;
	htmMessage = htmMessage.replace(/ {2}/g, " &nbsp;");

	return htmMessage;
};
