import { RsvpSettingsData, RsvpSettingsProps } from "./tabs";
import { RsvpBlacklistClient } from "./client-rsvp-blacklist";

interface RsvpBlacklistTabProps extends RsvpSettingsProps {
	onRsvpSettingsUpdated?: (updated: RsvpSettingsData) => void;
}

export const RsvpBlacklistTab: React.FC<RsvpBlacklistTabProps> = ({
	rsvpBlacklist = [],
}) => {
	return <RsvpBlacklistClient serverData={rsvpBlacklist} />;
};
