/**
 * Plays two short bell-like chimes (for waitlist "your table is ready" alerts).
 * Uses Web Audio API so no sound assets are required.
 */
export async function playWaitlistCalledBellTwice(): Promise<void> {
	if (typeof window === "undefined") {
		return;
	}
	try {
		const Ctx =
			window.AudioContext ||
			(
				window as unknown as {
					webkitAudioContext: typeof AudioContext;
				}
			).webkitAudioContext;
		if (!Ctx) {
			return;
		}
		const ctx = new Ctx();
		if (ctx.state === "suspended") {
			await ctx.resume();
		}

		const scheduleChime = (offsetSec: number) => {
			const t0 = ctx.currentTime + offsetSec;
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = "sine";
			osc.frequency.setValueAtTime(880, t0);
			osc.frequency.exponentialRampToValueAtTime(523.25, t0 + 0.12);
			gain.gain.setValueAtTime(0.0001, t0);
			gain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.015);
			gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.start(t0);
			osc.stop(t0 + 0.52);
		};

		scheduleChime(0);
		scheduleChime(0.65);

		window.setTimeout(() => {
			try {
				void ctx.close();
			} catch {
				// ignore
			}
		}, 1600);
	} catch {
		// Autoplay policy or unsupported — ignore
	}
}
