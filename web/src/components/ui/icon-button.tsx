import type { MouseEventHandler } from "react";

interface IconButtonProps {
	onClick?: MouseEventHandler<HTMLButtonElement> | undefined;
	icon: React.ReactElement;
	className?: string;
}

const defaultStyles = `
rounded-full
flex
items-center
justify-center
text-primary
bg-primary
hover:opacity-75
border
shadow-md
p-2
hover:scale-110
transition
`;

const IconButton: React.FC<IconButtonProps> = ({
	onClick,
	icon,
	className,
}) => {
	return (
		<button
			type="button"
			onClick={onClick}
			className={className === "" ? defaultStyles : className}
		>
			{icon}
		</button>
	);
};

export default IconButton;
