import { getTemplateLocalizationCoverageReport } from "@/lib/notification/template-localization-service";

async function main() {
	const report = await getTemplateLocalizationCoverageReport();
	console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
	console.error(
		JSON.stringify(
			{
				error: error instanceof Error ? error.message : String(error),
			},
			null,
			2,
		),
	);
	process.exit(1);
});

