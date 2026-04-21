/**
 * Shared parent for `storeAdmin/(root)` and `storeAdmin/(dashboard)` so both
 * route groups sit under one explicit segment layout (avoids edge-case routing
 * issues with sibling groups only).
 */
export default function StoreAdminSegmentLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return children;
}
