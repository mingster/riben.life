"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import ReactPlayer from "react-player";

import { Button } from "./ui/button";

// Constants
const ASPECT_RATIO = 16 / 9;
const DEBOUNCE_DELAY = 100;

// Types
export type MediaSource = {
	name: string;
	url: string;
};

interface VideoPlayerProps {
	sources: MediaSource[];
	className?: string;
	onSourceChange?: (source: MediaSource) => void;
	onPlayStateChange?: (playing: boolean) => void;
}

interface SourceButtonProps {
	source: MediaSource;
	isActive: boolean;
	onClick: (source: MediaSource) => void;
}

// Memoized source button component
const SourceButton = ({ source, isActive, onClick }: SourceButtonProps) => {
	return (
		<Button
			variant={isActive ? "default" : "outline"}
			className={`transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400 rounded ${
				isActive
					? "bg-amber-500 text-white hover:bg-amber-600"
					: "hover:bg-amber-50"
			}`}
			onClick={() => onClick(source)}
			aria-label={`Switch to ${source.name} source`}
			aria-pressed={isActive}
		>
			{source.name}
		</Button>
	);
};

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
	sources: initialSources,
	className = "",
	onSourceChange,
	onPlayStateChange,
}) => {
	const [calcWidth, setCalcWidth] = useState(0);
	const [source, setSource] = useState<MediaSource | null>(
		initialSources[0] || null,
	);
	const [playing, setPlaying] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const resizeTimeoutRef = useRef<NodeJS.Timeout>(null);

	// Memoized height calculation
	const playerHeight = useMemo(() => {
		return calcWidth > 0 ? calcWidth / ASPECT_RATIO : 0;
	}, [calcWidth]);

	// Memoized player config
	const playerConfig = useMemo(
		() =>
			({
				file: {
					attributes: {
						controlsList: "nodownload",
						disablePictureInPicture: true,
					},
				},
			}) as any,
		[],
	);

	// Optimized resize handler with debouncing
	const handleResize = useCallback((entries: ResizeObserverEntry[]) => {
		if (resizeTimeoutRef.current) {
			clearTimeout(resizeTimeoutRef.current);
		}

		resizeTimeoutRef.current = setTimeout(() => {
			const entry = entries[0];
			if (entry) {
				setCalcWidth(entry.contentRect.width);
			}
		}, DEBOUNCE_DELAY);
	}, []);

	// Setup resize observer
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		setCalcWidth(container.clientWidth);

		const resizeObserver = new ResizeObserver(handleResize);
		resizeObserver.observe(container);

		return () => {
			resizeObserver.disconnect();
			if (resizeTimeoutRef.current) {
				clearTimeout(resizeTimeoutRef.current);
			}
		};
	}, [handleResize]);

	// Handle source change
	const handleSourceChange = useCallback(
		(mediaSource: MediaSource) => {
			setSource(mediaSource);
			setPlaying(true);
			setError(null);
			onSourceChange?.(mediaSource);
		},
		[onSourceChange],
	);

	// Handle play state change
	const handlePlayStateChange = useCallback(
		(isPlaying: boolean) => {
			setPlaying(isPlaying);
			onPlayStateChange?.(isPlaying);
		},
		[onPlayStateChange],
	);

	// Handle player error
	const handlePlayerError = useCallback((error: any) => {
		console.error("Video player error:", error);
		setError("Failed to load video. Please try a different source.");
		setPlaying(false);
	}, []);

	// Handle player ready
	const handlePlayerReady = useCallback(() => {
		setError(null);
	}, []);

	// Validate sources
	const validSources = useMemo(() => {
		return initialSources.filter((source) => source.url && source.name);
	}, [initialSources]);

	// Set default source if none selected
	useEffect(() => {
		if (!source && validSources.length > 0) {
			setSource(validSources[0]);
		}
	}, [source, validSources]);

	// Error state
	if (error) {
		return (
			<div
				ref={containerRef}
				className={`aspect-video ${className}`}
				aria-label="Video player error"
			>
				<div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-800 rounded-lg">
					<div className="text-center">
						<p className="text-red-600 mb-4">{error}</p>
						<div className="flex flex-row gap-2">
							{validSources.map((mediaSource: MediaSource) => (
								<SourceButton
									key={mediaSource.name}
									source={mediaSource}
									isActive={source?.name === mediaSource.name}
									onClick={handleSourceChange}
								/>
							))}
						</div>
					</div>
				</div>
			</div>
		);
	}

	// No sources available
	if (validSources.length === 0) {
		return (
			<div
				ref={containerRef}
				className={`aspect-video ${className}`}
				aria-label="No video sources available"
			>
				<div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-800 rounded-lg">
					<p className="text-gray-600">No video sources available</p>
				</div>
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			className={`aspect-video ${className}`}
			aria-label="Video player"
		>
			{source && (
				<ReactPlayer
					src={source.url}
					controls={false}
					playing={playing}
					loop={true}
					width="100%"
					height={playerHeight}
					config={playerConfig}
					onError={handlePlayerError}
					onReady={handlePlayerReady}
					onPlay={() => handlePlayStateChange(true)}
					onPause={() => handlePlayStateChange(false)}
					style={{ borderRadius: "0.5rem" }}
				/>
			)}

			<fieldset
				className="flex flex-row gap-2 mt-4 border-none p-0 m-0"
				aria-label="Video source controls"
			>
				{validSources.map((mediaSource: MediaSource) => (
					<SourceButton
						key={mediaSource.name}
						source={mediaSource}
						isActive={source?.name === mediaSource.name}
						onClick={handleSourceChange}
					/>
				))}
			</fieldset>
		</div>
	);
};

export default VideoPlayer;
