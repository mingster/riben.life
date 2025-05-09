// https://github.com/streamich/react-use/blob/master/src/useMedia.ts
import { useEffect, useState } from "react";

export function useMedia(query: string, defaultState = false) {
	const [state, setState] = useState(defaultState);

	useEffect(() => {
		let mounted = true;
		const mql = window.matchMedia(query);
		const onChange = () => {
			if (!mounted) {
				return;
			}
			setState(!!mql.matches);
		};

		mql.addListener(onChange);
		setState(mql.matches);

		return () => {
			mounted = false;
			mql.removeListener(onChange);
		};
	}, [query]);

	return state;
}
