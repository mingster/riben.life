/**
 * Performance monitoring utilities for React components
 */

export interface PerformanceMetrics {
	componentName: string;
	mountTime: number;
	renderCount: number;
	lastRenderTime: number;
}

/**
 * Hook to track component performance metrics
 */
export const usePerformanceTracking = (componentName: string) => {
	const startTime = performance.now();

	return {
		getMetrics: (): PerformanceMetrics => ({
			componentName,
			mountTime: startTime,
			renderCount: 0, // This would need to be tracked in the component
			lastRenderTime: performance.now(),
		}),

		logMountDuration: () => {
			const duration = performance.now() - startTime;
			console.debug(`${componentName} mounted in ${duration.toFixed(2)}ms`);
			return duration;
		},

		logRenderDuration: (renderStartTime: number) => {
			const duration = performance.now() - renderStartTime;
			console.debug(`${componentName} rendered in ${duration.toFixed(2)}ms`);
			return duration;
		},
	};
};

/**
 * Utility to measure function execution time
 */
export const measureExecutionTime = <T extends (...args: any[]) => any>(
	fn: T,
	name: string,
): T => {
	return ((...args: Parameters<T>): ReturnType<T> => {
		const startTime = performance.now();
		try {
			const result = fn(...args);
			const duration = performance.now() - startTime;
			console.debug(`${name} executed in ${duration.toFixed(2)}ms`);
			return result;
		} catch (error) {
			const duration = performance.now() - startTime;
			console.error(`${name} failed after ${duration.toFixed(2)}ms:`, error);
			throw error;
		}
	}) as T;
};

/**
 * Debounce utility for performance optimization
 */
export const debounce = <T extends (...args: any[]) => any>(
	func: T,
	wait: number,
): T => {
	let timeout: NodeJS.Timeout;

	return ((...args: Parameters<T>) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), wait);
	}) as T;
};

/**
 * Throttle utility for performance optimization
 */
export const throttle = <T extends (...args: any[]) => any>(
	func: T,
	limit: number,
): T => {
	let inThrottle: boolean;

	return ((...args: Parameters<T>) => {
		if (!inThrottle) {
			func(...args);
			inThrottle = true;
			setTimeout(() => (inThrottle = false), limit);
		}
	}) as T;
};

/**
 * Memoization utility for expensive calculations
 */
export const memoize = <T extends (...args: any[]) => any>(
	fn: T,
	getKey: (...args: Parameters<T>) => string,
): T => {
	const cache = new Map<string, ReturnType<T>>();

	return ((...args: Parameters<T>): ReturnType<T> => {
		const key = getKey(...args);
		if (cache.has(key)) {
			return cache.get(key)!;
		}

		const result = fn(...args);
		cache.set(key, result);
		return result;
	}) as T;
};
