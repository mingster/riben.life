import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconCopy, IconServer } from "@tabler/icons-react";
interface ApiListingProps {
	title: string;
	description: string;
	variant: "public" | "admin";
}

const textMap: Record<ApiListingProps["variant"], string> = {
	public: "Public",
	admin: "Admin",
};

const variantMap: Record<ApiListingProps["variant"], string> = {
	public: "secondary",
	admin: "destructive",
};

export const ApiListing: React.FC<ApiListingProps> = ({
	title,
	description,
	variant = "public",
}) => {
	const onCopy = (description: string) => {
		navigator.clipboard.writeText(description);
		//toast.success("API Route copied to clipboard.");
	};

	return (
		<div className="pt-1">
			<Alert className="font-mono text-sm">
				<IconServer className="size-4" />
				<AlertTitle className="flex gap-1 items-center">
					{title}
					<Badge>{textMap[variant]}</Badge>
				</AlertTitle>
				<AlertDescription className="mt-1 flex items-center justify-between">
					<code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-xs">
						{description}
					</code>
					<Button
						variant="outline"
						size="sm"
						onClick={() => onCopy(description)}
					>
						<IconCopy className="size-4" />
					</Button>
				</AlertDescription>
			</Alert>
		</div>
	);
};
