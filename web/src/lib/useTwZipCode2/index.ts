import { useState } from "react";
import cities from "./data/cities";
import districts from "./data/districts";
import zipCodes from "./data/zipCode";

export const useTwZipCode2 = () => {
	const [city, setCity] = useState<string>(cities[0]);
	const [district, setDistrict] = useState<string>(districts[city][0]);
	const zipCode: string = zipCodes[city][district];

	const handleCityChange = async (value: string, district?: string) => {
		await setCity(value);

		if (district) setDistrict(`${district}`);
		else await setDistrict(districts[value][0]);
	};

	const handleDistrictChange = async (value: string) => {
		await setDistrict(value);
	};

	return {
		city,
		district,
		zipCode,
		handleCityChange,
		handleDistrictChange,
	};
};

export { cities, districts, zipCodes };
