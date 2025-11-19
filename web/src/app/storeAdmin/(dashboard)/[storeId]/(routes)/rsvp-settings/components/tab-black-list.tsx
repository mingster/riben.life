import { useTranslation } from "@/app/i18n/client";
import { Heading } from "@/components/ui/heading";
import { useI18n } from "@/providers/i18n-provider";
import { RsvpSettingsData, RsvpSettingsProps } from "./tabs";

interface RsvpBlacklistTabProps extends RsvpSettingsProps {
	onRsvpSettingsUpdated?: (updated: RsvpSettingsData) => void;
}
export const RsvpBlacklistTab: React.FC<RsvpBlacklistTabProps> = ({
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
				title={t("RSVP_Blacklist_Settings")}
				description={t("RSVP_Blacklist_Settings_Descr")}
			/>
		</>
	);
};
