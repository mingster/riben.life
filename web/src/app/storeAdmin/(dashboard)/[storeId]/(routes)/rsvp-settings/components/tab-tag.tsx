import { useTranslation } from "@/app/i18n/client";
import { Heading } from "@/components/ui/heading";
import { useI18n } from "@/providers/i18n-provider";
import { RsvpSettingsData, RsvpSettingsProps } from "./tabs";

interface RsvpTagTabProps extends RsvpSettingsProps {
	onRsvpSettingsUpdated?: (updated: RsvpSettingsData) => void;
}
export const RsvpTagTab: React.FC<RsvpTagTabProps> = ({
	store,
	rsvpSettings,
	onStoreUpdated,
	onRsvpSettingsUpdated,
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	return (
		<>
			<Heading
				title={t("rsvp_Tag_Settings")}
				description={t("rsvp_Tag_Settings_Descr")}
			/>
		</>
	);
};
