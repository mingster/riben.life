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
active:opacity-90
border
shadow-md
p-2
hover:scale-110
active:scale-105
transition
h-10 w-10
sm:h-9 sm:w-9
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
