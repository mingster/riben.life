"use client";

export const BackgroundImage: React.FC = () => {
	//const imgHost = '/img';

	const imgHost = "/img";

	//console.log(imgHost);

	return (
		<div className="absolute inset-x-0 top-0 z-20 flex justify-center overflow-hidden pointer-events-none">
			<div className="w-[108rem] flex-none flex justify-end">
				<picture>
					<source srcSet={`${imgHost}/beams/docs@30.avif`} type="image/avif" />
					<img
						src={`${imgHost}/beams/docs@tinypng.png`}
						alt=""
						className="w-[71.75rem] flex-none max-w-none dark:hidden"
						decoding="async"
					/>
				</picture>
				<picture>
					<source
						srcSet={`${imgHost}/beams/docs-dark@30.avif`}
						type="image/avif"
					/>
					<img
						src={`${imgHost}/beams/docs-dark@tinypng.png`}
						alt=""
						className="w-[90rem] flex-none max-w-none hidden dark:block"
						decoding="async"
					/>
				</picture>
			</div>
		</div>
	);
};
