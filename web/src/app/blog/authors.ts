import defaultAvatar from "./img/avatar.png";

export interface Author {
	name: string;
	twitter: string;
	avatar: string;
}

export const mingster = {
	name: "Mingster",
	twitter: "mingster",
	avatar: defaultAvatar.src,
} satisfies Author;
