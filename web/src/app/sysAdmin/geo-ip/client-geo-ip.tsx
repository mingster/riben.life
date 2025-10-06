"use client";

import { useState } from "react";
import { useGeoIP } from "@/hooks/use-geo-ip";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
	IconMapPin,
	IconGlobe,
	IconClock,
	IconRefresh,
	IconLocation,
} from "@tabler/icons-react";
import { ApiListing } from "@/components/api-listing";

export function ClientGeoIP() {
	const [customIP, setCustomIP] = useState("");
	const [targetCountry, setTargetCountry] = useState("US");
	const [targetContinent, setTargetContinent] = useState("NA");

	const {
		data,
		error,
		isLoading,
		isSuccess,
		isError,
		refetch,
		getCountryCode,
		getTimezone,
		getCoordinates,
		getFormattedLocation,
		isUserInCountry,
		isUserInContinent,
	} = useGeoIP();

	const handleCustomIPLookup = async () => {
		if (customIP.trim()) {
			// For demo purposes, we'll use the hook with a custom IP
			// In a real app, you might want to create a separate hook instance
			const result = await fetch(
				`/api/geo?ip=${encodeURIComponent(customIP.trim())}`,
			);
			const data = await result.json();
			console.log("Custom IP lookup result:", data);
		}
	};

	const handleClearCache = async () => {
		try {
			const response = await fetch("/api/geo?action=clear-cache");
			const data = await response.json();
			if (data.success) {
				// Refetch current location after clearing cache
				refetch();
			}
		} catch (error) {
			console.error("Failed to clear cache:", error);
		}
	};

	const handleGetCacheStats = async () => {
		try {
			const response = await fetch("/api/geo?action=cache-stats");
			const data = await response.json();
			console.log("Cache stats:", data);
		} catch (error) {
			console.error("Failed to get cache stats:", error);
		}
	};

	return (
		<div className="space-y-6 p-6">
			<div className="text-center">
				<h1 className="text-3xl font-bold mb-2">Geo IP Utility</h1>
				<p className="text-muted-foreground">
					Demonstrates IP geolocation functionality with caching and fallback
					services
				</p>
			</div>

			{/* Current Location Card */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<IconLocation className="h-5 w-5" />
						Current Location
					</CardTitle>
					<CardDescription>
						Your current location based on IP address
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{isLoading && (
						<div className="flex items-center justify-center py-8">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
							<span className="ml-2">Detecting your location...</span>
						</div>
					)}

					{isError && (
						<div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
							<p className="text-destructive font-medium">Error: {error}</p>
							<Button
								variant="outline"
								size="sm"
								onClick={refetch}
								className="mt-2"
							>
								<IconRefresh className="h-4 w-4 mr-2" />
								Retry
							</Button>
						</div>
					)}

					{isSuccess && data && (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-3">
								<div className="flex items-center gap-2">
									<IconMapPin className="h-4 w-4 text-muted-foreground" />
									<span className="font-medium">Location:</span>
									<span>{getFormattedLocation()}</span>
								</div>

								<div className="flex items-center gap-2">
									<IconGlobe className="h-4 w-4 text-muted-foreground" />
									<span className="font-medium">Country:</span>
									<Badge variant="secondary">
										{data.country} ({data.countryCode})
									</Badge>
								</div>

								<div className="flex items-center gap-2">
									<IconClock className="h-4 w-4 text-muted-foreground" />
									<span className="font-medium">Timezone:</span>
									<span>{getTimezone() || "Unknown"}</span>
								</div>

								<div className="flex items-center gap-2">
									<span className="font-medium">Coordinates:</span>
									<span className="text-sm text-muted-foreground">
										{getCoordinates()
											? `${getCoordinates()?.lat.toFixed(4)}, ${getCoordinates()?.lng.toFixed(4)}`
											: "Unknown"}
									</span>
								</div>
							</div>

							<div className="space-y-3">
								<div>
									<span className="font-medium">Region:</span>
									<p className="text-sm text-muted-foreground">
										{data.region || "Unknown"}
									</p>
								</div>

								<div>
									<span className="font-medium">City:</span>
									<p className="text-sm text-muted-foreground">
										{data.city || "Unknown"}
									</p>
								</div>

								<div>
									<span className="font-medium">ISP:</span>
									<p className="text-sm text-muted-foreground">
										{data.isp || "Unknown"}
									</p>
								</div>

								<div>
									<span className="font-medium">IP Address:</span>
									<p className="text-sm text-muted-foreground font-mono">
										{data.ip}
									</p>
								</div>
							</div>
						</div>
					)}

					<Separator />

					<div className="flex gap-2">
						<Button onClick={refetch} variant="outline" size="sm">
							<IconRefresh className="h-4 w-4 mr-2" />
							Refresh
						</Button>
						<Button onClick={handleClearCache} variant="outline" size="sm">
							Clear Cache
						</Button>
						<Button onClick={handleGetCacheStats} variant="outline" size="sm">
							Cache Stats
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Location Checks Card */}
			<Card>
				<CardHeader>
					<CardTitle>Location Checks</CardTitle>
					<CardDescription>
						Check if you're in specific countries or continents
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="target-country">Target Country Code</Label>
							<Input
								id="target-country"
								value={targetCountry}
								onChange={(e) => setTargetCountry(e.target.value.toUpperCase())}
								placeholder="US, CA, GB, etc."
								maxLength={3}
							/>
							{isSuccess && (
								<div className="flex items-center gap-2">
									<span>In {targetCountry}:</span>
									<Badge
										variant={
											isUserInCountry(targetCountry) ? "default" : "secondary"
										}
									>
										{isUserInCountry(targetCountry) ? "Yes" : "No"}
									</Badge>
								</div>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="target-continent">Target Continent Code</Label>
							<Input
								id="target-continent"
								value={targetContinent}
								onChange={(e) =>
									setTargetContinent(e.target.value.toUpperCase())
								}
								placeholder="NA, EU, AS, etc."
								maxLength={3}
							/>
							{isSuccess && (
								<div className="flex items-center gap-2">
									<span>In {targetContinent}:</span>
									<Badge
										variant={
											isUserInContinent(targetContinent)
												? "default"
												: "secondary"
										}
									>
										{isUserInContinent(targetContinent) ? "Yes" : "No"}
									</Badge>
								</div>
							)}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Custom IP Lookup Card */}
			<Card>
				<CardHeader>
					<CardTitle>Custom IP Lookup</CardTitle>
					<CardDescription>
						Look up geo location for a specific IP address
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex gap-2">
						<Input
							value={customIP}
							onChange={(e) => setCustomIP(e.target.value)}
							placeholder="Enter IP address (e.g., 8.8.8.8)"
							className="flex-1"
						/>
						<Button onClick={handleCustomIPLookup} disabled={!customIP.trim()}>
							Lookup
						</Button>
					</div>
					<p className="text-sm text-muted-foreground">
						Check the browser console for the lookup result
					</p>
				</CardContent>
			</Card>

			{/* API Endpoints Card */}
			<Card>
				<CardHeader>
					<CardTitle>Available API Endpoints</CardTitle>
					<CardDescription>
						REST API endpoints for geo IP functionality
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ApiListing
						title="Get current location"
						description="/api/geo"
						variant="admin"
					/>

					<ApiListing
						title="Get location for specific IP"
						description="/api/geo?ip=8.8.8.8"
						variant="admin"
					/>

					<ApiListing
						title="Get timezone only"
						description="/api/geo?action=timezone"
						variant="admin"
					/>

					<ApiListing
						title="Check if in country"
						description="/api/geo?action=check-country&countryCode=US"
						variant="admin"
					/>

					<ApiListing
						title="Get coordinates only"
						description="/api/geo?action=coordinates"
						variant="admin"
					/>

					<ApiListing
						title="Check if in continent"
						description="/api/geo?action=check-continent&continentCode=NA"
						variant="admin"
					/>

					<ApiListing
						title="Get formatted location string"
						description="/api/geo?action=formatted-location"
						variant="admin"
					/>

					<ApiListing
						title="Get cache statistics"
						description="/api/geo?action=cache-stats"
						variant="admin"
					/>

					<ApiListing
						title="Clear the cache"
						description="/api/geo?action=clear-cache"
						variant="admin"
					/>
				</CardContent>
			</Card>
		</div>
	);
}
