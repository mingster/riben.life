"use client";

import clsx from "clsx";
import {
	motion,
	type MotionValue,
	useMotionValue,
	useTransform,
} from "framer-motion";
import {
	ComponentProps,
	createContext,
	RefObject,
	useContext,
	useEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
} from "react";

const DEFAULT_OFFSET = 768;

function computeSize(element: HTMLElement | null) {
	if (element === null) return { width: 0, height: 0 };
	const { width, height } = element.getBoundingClientRect();
	return { width, height };
}

export function useMeasure(elementRef: RefObject<HTMLElement | null>) {
	const [identity, forceRerender] = useReducer(() => ({}), {});

	// When the element changes during a re-render, we want to make sure we
	// compute the correct size as soon as possible. However, once the element is
	// stable, we also want to watch for changes to the element. The `identity`
	// state can be used to recompute the size.
	const size = useMemo(
		() => computeSize(elementRef.current),
		[elementRef, identity],
	);

	useEffect(() => {
		if (!elementRef.current) return;

		// Trigger a re-render whenever the element resizes
		const observer = new ResizeObserver(forceRerender);
		observer.observe(elementRef.current);

		return () => {
			observer.disconnect();
		};
	}, [elementRef, elementRef.current]);

	return size;
}

const ResizableContext = createContext<{
	x: MotionValue<number>;
	panelRef: RefObject<HTMLDivElement | null>;
} | null>(null);

export function Resizable({
	children,
	className,
	...props
}: ComponentProps<"div">) {
	const [isDragging, setIsDragging] = useState(false);
	const x = useMotionValue(0);
	const handleRef = useRef<HTMLDivElement | null>(null);
	const constraintsRef = useRef<HTMLDivElement | null>(null);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const panelRef = useRef<HTMLDivElement | null>(null);

	const context = useMemo(() => {
		return {
			x,
			handleRef,
			constraintsRef,
			panelRef,
			isDragging,
			setIsDragging,
		};
	}, [x, handleRef, constraintsRef, panelRef, isDragging, setIsDragging]);

	useEffect(() => {
		if (!containerRef.current) return;
		const observer = new window.ResizeObserver(([{ target }]) => {
			const width = target.getBoundingClientRect().width ?? 0;
			x.set(-Math.max(0, width - DEFAULT_OFFSET));
		});
		observer.observe(containerRef.current);
		return () => {
			observer.disconnect();
		};
	}, [x]);

	return (
		<ResizableContext.Provider value={context}>
			<div
				ref={containerRef}
				className={clsx(className, "relative")}
				{...props}
			>
				{children}
			</div>
		</ResizableContext.Provider>
	);
}

export function ResizablePanel(props: ComponentProps<typeof motion.div>) {
	const context = useContext(ResizableContext);
	if (!context) throw new Error("ResizablePanel must be a child of Resizable");
	const { x } = context;

	return (
		<motion.div
			ref={context.panelRef}
			{...props}
			style={{ marginRight: useTransform(x, (x) => -x) }}
		/>
	);
}

export function ResizableHandle(props: ComponentProps<typeof motion.div>) {
	const context = useContext(ResizableContext);
	if (!context) throw new Error("ResizableHandle must be a child of Resizable");
	const { x } = context;
	const handleRef = useRef<HTMLElement>(null);
	const constraintsRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!handleRef.current) return;
		handleRef.current.onselectstart = () => false;
	}, []);

	const { width } = useMeasure(context.panelRef);

	const atSmBreakpoint = width >= 640 || undefined;
	const atMdBreakpoint = width >= 768 || undefined;
	const atLgBreakpoint = width >= 1024 || undefined;
	const atXlBreakpoint = width >= 1280 || undefined;

	return (
		<div>
			{/* Minimum width of the panel is 400px */}
			<div className="relative ml-100">
				<div
					ref={constraintsRef}
					data-sm={atSmBreakpoint}
					data-md={atMdBreakpoint}
					data-lg={atLgBreakpoint}
					data-xl={atXlBreakpoint}
				/>
			</div>
			<motion.div
				title="Drag to resize"
				drag="x"
				dragElastic={0}
				dragMomentum={false}
				dragConstraints={constraintsRef}
				style={{ x }}
				onDragStart={() => {
					document.documentElement.classList.add(
						"select-none",
						"**:cursor-ew-resize",
					);
				}}
				onDragEnd={() => {
					document.documentElement.classList.remove(
						"select-none",
						"**:cursor-ew-resize",
					);
				}}
				{...props}
			/>
		</div>
	);
}
