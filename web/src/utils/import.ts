export function parseCsv(csvText: string): any[] {
	if (!csvText) return [];

	const lines = [];
	let currentLine = [];
	let currentField = "";
	let insideQuotes = false;

	for (let i = 0; i < csvText.length; i++) {
		const char = csvText[i];
		const nextChar = csvText[i + 1];

		if (char === '"') {
			if (insideQuotes && nextChar === '"') {
				currentField += '"';
				i++; // Skip next quote
			} else {
				insideQuotes = !insideQuotes;
			}
		} else if (char === "," && !insideQuotes) {
			currentLine.push(currentField);
			currentField = "";
		} else if (char === "\n" && !insideQuotes) {
			// Handle Windows CRLF
			if (currentField.endsWith("\r")) {
				currentField = currentField.slice(0, -1);
			}
			currentLine.push(currentField);
			lines.push(currentLine);
			currentLine = [];
			currentField = "";
		} else {
			currentField += char;
		}
	}

	// Add the last field/line if not empty
	if (currentField || currentLine.length > 0) {
		if (currentField.endsWith("\r")) {
			currentField = currentField.slice(0, -1);
		}
		currentLine.push(currentField);
		lines.push(currentLine);
	}

	if (lines.length < 2) return [];

	const headers = lines[0];
	const rows = [];

	for (let i = 1; i < lines.length; i++) {
		const row = lines[i];
		if (row.length === 1 && row[0] === "") continue; // Skip empty lines

		const obj: Record<string, any> = {};
		for (let j = 0; j < headers.length; j++) {
			let val = row[j] || "";
			// try to parse JSON back if it starts with { or [
			if (
				(val.startsWith("{") && val.endsWith("}")) ||
				(val.startsWith("[") && val.endsWith("]"))
			) {
				try {
					val = JSON.parse(val);
				} catch (e) {
					// Ignore parsing error, keep as string
				}
			}
			obj[headers[j]] = val;
		}
		rows.push(obj);
	}

	return rows;
}
