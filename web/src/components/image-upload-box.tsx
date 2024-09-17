import { BoxSelect } from "lucide-react";
import Image from "next/image";
import type React from "react";
import { useState } from "react";
//render a image upload box

interface ImageUploadBoxProp {
  image: File | null;
  setImage: (image: File | null) => void;
}

const ImageUploadBox: React.FC<ImageUploadBoxProp> = ({
  image,
  setImage,
}: {
  image: File | null;
  setImage: (image: File | null) => void;
}) => {
  const [isDropZone, setIsDropZone] = useState(false);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDropZone(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    setIsDropZone(false);
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.dropEffect = "copy";
    setIsDropZone(true);
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      //1. check file.name for acepted file types....

      //2. check file dimensions....

      //accept the file
      setImage(file);
    }
    e.dataTransfer.clearData();
    setIsDropZone(false);

    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      onDrop={(e) => handleDrop(e)}
      onDragOver={(e) => handleDragOver(e)}
      onDragEnter={(e) => handleDragEnter(e)}
      onDragLeave={(e) => handleDragLeave(e)}
      className="h-[240px] max-w-xs flex-1 overflow-hidden rounded-lg border"
    >
      {isDropZone && (
        <div className="absolute bottom-0 left-0 right-0 top-0 z-10 scale-[1.01] rounded-md border-4 border-dashed bg-white/40" />
      )}
      {image ? (
        <div className="relative h-full w-full rounded-md">
          <Image
            className="my-0 h-full w-full rounded-md object-cover"
            src={URL.createObjectURL(image)}
            width={120}
            height={40}
            alt={image.name}
          />
          {/*
          <img
            className="object-cover h-full w-full rounded-md my-0"
            src={URL.createObjectURL(image)}
            alt={image.name}
          /> */}
          <label
            className="absolute bottom-2 my-0 flex w-full justify-center"
            htmlFor="post_image"
          >
            <div className="mt-4 cursor-pointer rounded-lg bg-blue-700/70 px-7 py-2.5 text-sm font-medium leading-5 text-primary">
              Change
            </div>
          </label>
          <input
            type="file"
            onChange={(e) => {
              //console.log(e.target.files);
              setImage(e.target.files && e.target.files[0]);
            }}
            className="hidden"
            id="post_image"
          />
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 py-4">
          <BoxSelect className="h-10 w-10" />
          <p className="my-0 text-sm font-medium">Drag and Drop</p>

          <div>
            <label htmlFor="post_image">
              <div className="mt-4 cursor-pointer rounded-lg px-7 py-2.5 text-sm font-medium leading-5 border">
                Choose Image
              </div>
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                console.log(e.target.files);
                setImage(e.target.files && e.target.files[0]);
              }}
              className="hidden"
              id="post_image"
            />
          </div>
        </div>
      )}
    </div>
  );
};
export default ImageUploadBox;
