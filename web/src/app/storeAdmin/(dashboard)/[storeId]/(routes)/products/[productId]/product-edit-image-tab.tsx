"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { type UseFormProps, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

import { toastError, toastSuccess } from "@/components/Toaster";
import ImageUploadBox from "@/components/image-upload-box";
import { Button } from "@/components/ui/button";
import { deleteImage, uploadImage } from "@/utils/utils";
import axios from "axios";
import { XCircleIcon } from "lucide-react";
import Image from "next/image";

const validationSchema = z.object({
	productImages: z.array(
		z.object({
			id: z.string().optional(),
			productId: z.string(),
			url: z.string(),
			imgPublicId: z.string(),
		}),
	),
});

type ProductImages = z.infer<typeof validationSchema>["productImages"][number];

function useZodForm<TSchema extends z.ZodType>(
	props: Omit<UseFormProps<TSchema["_input"]>, "resolver"> & {
		schema: TSchema;
	},
) {
	const form = useForm<TSchema["_input"]>({
		...props,
		resolver: zodResolver(validationSchema, undefined, {
		//resolver: zodResolver(props.schema, undefined, {
			// This makes it so we can use `.transform()`s on the schema without same transform getting applied again when it reaches the server
			//rawValues: true
		}),
	});

	return form;
}

interface props {
	initialData?: ProductImages[] | [];
	action: string;
}
export const ProductEditImageTab = ({ initialData, action }: props) => {
	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		setMounted(true);
	}, []);

	const params = useParams();
	const router = useRouter();

	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	const {
		handleSubmit,
		register,
		control,
		formState: { isValid, errors, isValidating, isDirty },
		reset,
	} = useZodForm({
		schema: validationSchema,
		defaultValues: { productImages: initialData },
		mode: "onChange",
	});

	const { fields, append, remove } = useFieldArray({
		name: "productImages",
		control,
	});

	const [openAddNew, setOpenAddNew] = useState(false);

	const [loading, setLoading] = useState(false);
	const [image, setImage] = useState<File | null>(null);

	/*
  product.storeId = `${params.storeId}`;
  console.log(`initialData images: ${JSON.stringify(initialData)}`);
  console.log(`initialData fields: ${JSON.stringify(fields)}`);
  */
	//console.log(`product id: ${params.productId}`);
	//console.log(`defaultValues: ${JSON.stringify(defaultValues)}`);
	if (!mounted) return <></>;

	//user click create new button
	const handleNewImageSubmit = async (
		_event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
	) => {
		//try {
		setLoading(true);
		//console.log(event.target);
		//console.log(event.currentTarget);
		//console.log(`image is null? ${image}` === null);

		if (image) {
			//const folderName = `${params.storeId}/product/${params.productId}`;
			const folderName = "product";
			const result = await uploadImage(folderName, image, 500, 500);
			console.log(`upload result: ${JSON.stringify(result)}`);

			const newImage = {
				productId: `${params.productId}`,
				url: result.secure_url,
				imgPublicId: result.public_id,
			};

			//insert to Db
			await axios.patch(
				`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/product/${params.productId}/image`,
				newImage,
			);

			//update data set
			append(newImage);
		}

		toastSuccess({
			title: "product image saved.",
			description: "",
		});

		setLoading(false);
		router.refresh();
		//close addnew dialog
		setOpenAddNew(false);
		/*
	} catch (err: unknown) {
	  const error = err as AxiosError;
	  toastError({
		title: "Something went wrong.",
		description: error.message,
	  });
	} finally {

	}*/
	};

	const handleDelete = async (index: number) => {
		//try {
		setLoading(true);
		if (!initialData) return;

		/*
	console.log(`rowToRemove idx: ${index}`);
	console.log(`rowToRemove data: ${JSON.stringify(initialData)}`);
	console.log(`rowToRemove id: ${initialData[index].id}`);
	console.log(`rowToRemove imgPublicId: ${initialData[index].imgPublicId}`);
	*/

		await deleteImage(initialData[index].imgPublicId as string);

		//delete from Db
		const urlToDelete = `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/product/${params.productId}/image`;
		await axios.delete(urlToDelete, { data: initialData[index] });

		remove(index);
		toastSuccess({
			title: "product image deleted.",
			description: "",
		});

		setLoading(false);
		router.refresh();
		/*
	} catch (err: unknown) {
	  const error = err as AxiosError;
	  toastError({
		title: "Something went wrong.",
		description: error.message,
	  });
	} finally {
	}
	  */
	};

	return (
		<>
			{/* create new */}
			<Dialog open={openAddNew} onOpenChange={setOpenAddNew}>
				<DialogTrigger asChild>
					<Button variant="outline">Add New</Button>
				</DialogTrigger>
				<DialogContent className="w-full">
					<DialogHeader>
						<DialogTitle>Add New</DialogTitle>
						<DialogDescription />
					</DialogHeader>

					<div className="flex justify-center">
						<ImageUploadBox
							disabled={loading}
							image={image ?? null}
							setImage={setImage ?? (() => {})}
						/>
					</div>
					<DialogFooter className="">
						<Button
							type="button"
							disabled={loading}
							className="disabled:opacity-25"
							onClick={handleNewImageSubmit}
						>
							{t("Create")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* display */}
			<Card>
				<CardContent className="space-y-2">
					<div className="flex flex-row">
						{fields.map((item, index) => (
							<div
								key={item.id}
								className="relative size-[200px] overflow-hidden"
							>
								<div className="absolute right-1 top-2 z-10">
									<Button
										variant="ghost"
										size="icon"
										type="button"
										disabled={loading}
										className="disabled:opacity-25"
										onClick={() => handleDelete(index)}
									>
										<XCircleIcon className="text-red-700" />
									</Button>
								</div>
								<Image
									src={item.url as string}
									className="object-cover"
									alt=""
									width={500}
									height={500}
								/>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</>
	);
};
