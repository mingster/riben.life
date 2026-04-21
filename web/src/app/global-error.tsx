"use client";

export const dynamic = "force-dynamic";

export default function GlobalError({
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<html lang="en">
			<body
				style={{
					display: "flex",
					minHeight: "100vh",
					alignItems: "center",
					justifyContent: "center",
					fontFamily: "sans-serif",
					padding: "2rem",
				}}
			>
				<div style={{ textAlign: "center", maxWidth: 400 }}>
					<h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
						Something went wrong
					</h1>
					<button
						type="button"
						onClick={reset}
						style={{
							padding: "0.5rem 1.5rem",
							cursor: "pointer",
							borderRadius: "0.375rem",
							border: "1px solid #ccc",
						}}
					>
						Try again
					</button>
				</div>
			</body>
		</html>
	);
}
