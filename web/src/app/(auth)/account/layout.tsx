import { Navbar } from "@/components/global-navbar";
//import { Loader } from "@/components/ui/loader";
import { Toaster } from "@/components/ui/toaster";
//import { Metadata } from 'next';
//import { sqlClient } from '@/lib/prismadb';

import { use } from "react";
type Params = Promise<{ storeId: string }>;

export default async function AuthLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Params;
}) {
	//const { storeId } = await params;

	return (
		<>
			<div className="bg-no-repeat bg-[url('/images/beams/hero@75.jpg')] dark:bg-[url('/images/beams/hero-dark@90.jpg')]">
				<Navbar title="" />
				<main className="">{children}</main>
			</div>
			<Toaster />
		</>
	);
}

/*

export function AuthLayoutSyncronous(props: {
  children: React.ReactNode
  params: Params
}) {
  const params = use(props.params);
  //const storeId = params.storeId;

  return (
    <>
      <div className="bg-no-repeat bg-[url('/images/beams/hero@75.jpg')] dark:bg-[url('/images/beams/hero-dark@90.jpg')]">
        <Navbar title="" />
        <main className="">{props.children}</main>
      </div>
      <Toaster />
    </>
  );
}

export async function AuthLayoutOLD({
  children, // will be a page or nested layout
  props,
}: {
  children: React.ReactNode;
  props: {
    params: Promise<{ storeId: string }>;
  },
}) {
  return (
    <>
      <div className="bg-no-repeat bg-[url('/images/beams/hero@75.jpg')] dark:bg-[url('/images/beams/hero-dark@90.jpg')]">
        <Navbar title="" />
        <main className="">{children}</main>
      </div>
      <Toaster />
    </>
  );
}
*/
