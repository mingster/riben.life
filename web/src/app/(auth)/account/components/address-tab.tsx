import { Card, CardContent, CardFooter } from "@/components/ui/card";
import logger from "@/lib/logger";
import type { Address } from "@prisma/client";

type tabProps = { addresses: Address[] };
export const AddressesTab = ({ addresses }: tabProps) => {
	logger.info(addresses);

	if (addresses === null || addresses === undefined) return <></>;

	return (
		<>
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
