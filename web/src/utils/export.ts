export function exportToCsv<T extends Record<string, any>>(
	filename: string,
	rows: T[],
) {
	if (!rows || !rows.length) return;

	const keys = Object.keys(rows[0]);
	const csvContent = [
		keys.join(","),
		...rows.map((row) =>
			keys
				.map((k) => {
					let val = row[k];
					if (val === null || val === undefined) val = "";
					else if (typeof val === "object") val = JSON.stringify(val);
					val = String(val).replace(/"/g, '""');
					return `"${val}"`;
				})
				.join(","),
		),
	].join("\n");

	const blob = new Blob(["\uFEFF" + csvContent], {
		type: "text/csv;charset=utf-8;",
	});
	const link = document.createElement("a");
	const url = URL.createObjectURL(blob);
	link.setAttribute("href", url);
	link.setAttribute("download", filename);
	link.style.visibility = "hidden";
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}

export function exportToJson(filename: string, data: any) {
	const blob = new Blob([JSON.stringify(data, null, 2)], {
		type: "application/json",
	});
	const link = document.createElement("a");
	const url = URL.createObjectURL(blob);
	link.setAttribute("href", url);
	link.setAttribute("download", filename);
	link.style.visibility = "hidden";
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}
