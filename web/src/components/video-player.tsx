//import { useEffect, useRef, useState } from 'react';
import { useEffect, useState } from "react";
import ReactPlayer from "react-player";

import { Button } from "./ui/button";

export type MediaSource = {
	name: string;
	url: string;
};

export const VideoPlayer: React.FC<{ sources: MediaSource[] }> = ({
	sources: initialSources,
}) => {
	const [calcWidth, setCalcWidth] = useState(0);

	const [source, setSource] = useState<MediaSource | null>(initialSources[0]);
	const [playing, setPlaying] = useState(false);

	useEffect(() => {
		const container = document.querySelector(".aspect-video");
		if (container) {
			setCalcWidth(container.clientWidth);
			const resizeObserver = new ResizeObserver((entries) => {
				setCalcWidth(entries[0].contentRect.width);
			});
			resizeObserver.observe(container);
			return () => resizeObserver.disconnect();
		}
	}, []);

	const handleSourceChange = (mediaSource: MediaSource) => {
		setSource(mediaSource);
		setPlaying(true);
	};

	return (
		<div className="aspect-video">
			<ReactPlayer
				src={source?.url}
				controls={false}
				playing={playing}
				loop={true}
				width="100%"
				height={(calcWidth / 16) * 9}
				config={{}}
			/>

			<div className="flex flex-row gap-2">
				{initialSources.map((mediaSource: MediaSource) => (
					<Button
						variant="outline"
						key={mediaSource.name}
						onClick={() => handleSourceChange(mediaSource)}
					>
						{mediaSource.name}
					</Button>
				))}
			</div>
		</div>
	);
};

export default VideoPlayer;
