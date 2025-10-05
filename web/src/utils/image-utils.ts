import axios from "axios";
import Resizer from "react-image-file-resizer";
import { generateSHA1, generateSignature } from "./utils";
import { clientLogger } from "@/lib/client-logger";

export async function resizeAndCropImage(
	file: File,
	name: string,
	size: number,
	extension: string,
): Promise<File> {
	const image = await loadImage(file);

	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = size;

	const ctx = canvas.getContext("2d");

	const minEdge = Math.min(image.width, image.height);

	const sx = (image.width - minEdge) / 2;
	const sy = (image.height - minEdge) / 2;
	const sWidth = minEdge;
	const sHeight = minEdge;

	ctx?.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, size, size);

	const resizedImageBlob = await new Promise<Blob | null>((resolve) =>
		canvas.toBlob(resolve, `image/${extension}`),
	);

	return new File([resizedImageBlob as BlobPart], `${name}.${extension}`, {
		type: `image/${extension}`,
	});
}

async function loadImage(file: File): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		const reader = new FileReader();

		reader.onload = (e) => {
			image.src = e.target?.result as string;
		};

		image.onload = () => resolve(image);
		image.onerror = (err) => reject(err);

		reader.readAsDataURL(file);
	});
}

export async function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => resolve(reader.result as string);
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

// #region cloudinary

//https://articles.wesionary.team/image-optimization-in-react-during-upload-5ca351d943d1
const resizeFile = (
	file: File,
	resizeToWidth?: number,
	resizeToHeight?: number,
) =>
	new Promise((resolve) => {
		let quality = 100;
		//4MB image file
		if (file.size > 4000000) {
			quality = 90;
		}
		//8MB image file
		if (file.size > 8000000) {
			quality = 85;
		}

		if (resizeToWidth && resizeToHeight)
			Resizer.imageFileResizer(
				file,
				resizeToWidth,
				resizeToHeight,
				"JPEG",
				quality,
				0,
				(uri) => {
					resolve(uri);
				},
				//'blob'
				"base64",
			);
	});

//upload image to cloudinary
//BUG: resizeToWidth & resizeToHeight must be specified -- otherwise upload won't happen...
export const uploadImage = async (
	folderName: string,
	image: File,
	resizeToWidth?: number,
	resizeToHeight?: number,
) => {
	const YOUR_CLOUD_NAME = process.env
		.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME as string;
	const YOUR_UNSIGNED_UPLOAD_PRESET = process.env
		.NEXT_PUBLIC_CLOUDINARY_UNSIGNED_UPLOAD_PRESET as string;

	const resizedImage = (await resizeFile(
		image,
		resizeToWidth,
		resizeToHeight,
	)) as File;

	const formData = new FormData();
	formData.append("file", resizedImage);
	formData.append("upload_preset", YOUR_UNSIGNED_UPLOAD_PRESET);
	formData.append("folder", folderName);

	try {
		const res = await axios.post(
			`https://api.cloudinary.com/v1_1/${YOUR_CLOUD_NAME}/image/upload`,
			formData,
			{
				headers: {
					"Content-Type": "multipart/form-data",
				},
			},
		);

		//upload_response: https://cloudinary.com/documentation/upload_images#upload_response
		return res.data;
	} catch (error) {
		clientLogger.error(error as Error, {
			message: "Error uploading image to Cloudinary",
			metadata: { folderName, imageName: image.name },
			tags: ["cloudinary", "upload", "error"],
			service: "uploadImage",
			environment: process.env.NODE_ENV,
			version: process.env.npm_package_version,
		});

		return error;
	}
};

//call cloudinary to delete the image
// https://cloudinary.com/documentation/image_upload_api_reference#destroy
//https://www.obytes.com/blog/cloudinary-in-nextjs
export const deleteImage = async (publicId: string) => {
	const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME as string;
	const timestamp = new Date().getTime();
	const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_APIKEY as string;
	const apiSecret = process.env.NEXT_PUBLIC_CLOUDINARY_APISECRET as string;
	const signature = generateSHA1(generateSignature(publicId, apiSecret));
	const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`;

	try {
		const _response = await axios.post(url, {
			public_id: publicId,
			signature: signature,
			api_key: apiKey,
			timestamp: timestamp,
		});

		//console.log('handleDeleteImage: ' + JSON.stringify(response));
	} catch (error) {
		clientLogger.error(error as Error, {
			message: "Error deleting image from Cloudinary",
			metadata: { publicId },
			tags: ["cloudinary", "delete", "error"],
			service: "deleteImage",
			environment: process.env.NODE_ENV,
			version: process.env.npm_package_version,
		});
	}
};
// #endregion cloudinary
