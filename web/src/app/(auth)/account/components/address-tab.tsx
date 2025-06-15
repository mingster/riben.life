import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";
import logger from "@/utils/logger";
import type { Address } from "@prisma/client";
import { Plus } from "lucide-react";

type tabProps = { addresses: Address[] };
export const AddressesTab = ({ addresses }: tabProps) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	logger.info(addresses);

	if (addresses === null || addresses === undefined) return <></>;

	return (
		<>
			<div className="flex items-center justify-between">
				<div>
					{/*新增 */}
					<Button variant={"outline"} onClick={() => <></>}>
						<Plus className="mr-0 size-4" />
						{t("Create")}
					</Button>
				</div>
			</div>
			<Separator />

			<div className="flex-col">
				<div className="flex-1 p-1 space-y-1">
					{addresses.map((addr: Address) => (
						<div key={addr.id}>
							<DisplayAddress address={addr} />
						</div>
					))}
				</div>
			</div>
		</>
	);
};

type prop = { address: Address };

export const DisplayAddress: React.FC<prop> = ({ address }) => {
	logger.info(address);

	return (
		<Card key={address.id} className="py-1">
			<CardContent>addr</CardContent>
		</Card>
	);
};
