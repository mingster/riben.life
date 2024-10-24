import crypto from "crypto";
import axios from "axios";
import { type ClassValue, clsx } from "clsx";
import { format } from "date-fns";
import Resizer from "react-image-file-resizer";
import { twMerge } from "tailwind-merge";

import Decimal from "decimal.js"; // gets added if installed
import { z } from "zod";
// recursive function looping deeply throug an object to find Decimals
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export const transformDecimalsToNumbers = (obj: any) => {
  if (!obj) {
    return;
  }

  for (const key of Object.keys(obj)) {
    if (Decimal.isDecimal(obj[key])) {
      obj[key] = obj[key].toNumber();
    } else if (typeof obj[key] === "object") {
      transformDecimalsToNumbers(obj[key]);
    }
  }
};

function nullable<TSchema extends z.AnyZodObject>(schema: TSchema) {
  const entries = Object.entries(schema.shape) as [keyof TSchema['shape'], z.ZodTypeAny][];

  const newProps = entries.reduce((acc, [key, value]) => {
      acc[key] = value.nullable();
      return acc;
  }, {} as {
      [key in keyof TSchema['shape']]: z.ZodNullable<TSchema['shape'][key]>
  });

  return z.object(newProps)
}

export const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getAbsoluteUrl() {
  const origin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "";

  return origin;
}

export function getHostname() {
  const origin =
    typeof window !== "undefined" && window.location.hostname
      ? window.location.hostname
      : "";

  return origin;
}

export function isIOS() {
  return (
    [
      "iPad Simulator",
      "iPhone Simulator",
      "iPod Simulator",
      "iPad",
      "iPhone",
      "iPod",
    ].includes(navigator.platform) ||
    // iPad on iOS 13 detection
    (navigator.userAgent.includes("Mac") && "ontouchend" in document)
  );
}

export const generateSHA1 = (data: crypto.BinaryLike) => {
  const hash = crypto.createHash("sha1");
  hash.update(data);
  return hash.digest("hex");
};

export const generateSignature = (publicId: string, apiSecret: string) => {
  const timestamp = new Date().getTime();
  return `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
};

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
    console.error(error);
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
    const response = await axios.post(url, {
      public_id: publicId,
      signature: signature,
      api_key: apiKey,
      timestamp: timestamp,
    });

    //console.log('handleDeleteImage: ' + JSON.stringify(response));
  } catch (error) {
    console.error(error);
  }
};

export const toDateTime = (secs: number) => {
  const t = new Date(+0); // Unix epoch start.
  t.setSeconds(secs);
  return t;
};

// https://nextjs.org/learn-pages-router/basics/dynamic-routes/polishing-post-page
// https://github.com/you-dont-need/You-Dont-Need-Momentjs?tab=readme-ov-file#string--time-format
export const formatDateTime = (d: Date) => {
  return format(d, "yyyy-MM-dd H:mm");
};

export const calculateTrialEndUnixTimestamp = (
  trialPeriodDays: number | null | undefined,
) => {
  // Check if trialPeriodDays is null, undefined, or less than 2 days
  if (
    trialPeriodDays === null ||
    trialPeriodDays === undefined ||
    trialPeriodDays < 2
  ) {
    return undefined;
  }

  const currentDate = new Date(); // Current date and time
  const trialEnd = new Date(
    currentDate.getTime() + (trialPeriodDays + 1) * 24 * 60 * 60 * 1000,
  ); // Add trial days
  return Math.floor(trialEnd.getTime() / 1000); // Convert to Unix timestamp in seconds
};

// Inspired from https://github.com/microsoft/TypeScript/issues/30611#issuecomment-570773496
export function getEnumKeys<
  T extends string,
  TEnumValue extends string | number,
>(enumVariable: { [key in T]: TEnumValue }) {
  return Object.keys(enumVariable) as Array<T>;
}
