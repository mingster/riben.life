import { backfillMissingTemplateLocalizations } from "@/lib/notification/template-localization-service";

async function main() {
	const result = await backfillMissingTemplateLocalizations();
	console.log(
		JSON.stringify(
			{
				success: true,
				result,
			},
			null,
			2,
		),
	);
}

main().catch((error) => {
	console.error(
		JSON.stringify(
			{
				success: false,
				error: error instanceof Error ? error.message : String(error),
			},
			null,
			2,
		),
	);
	process.exit(1);
});

