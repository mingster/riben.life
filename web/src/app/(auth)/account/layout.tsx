import { Navbar } from "@/components/global-navbar";
import { Loader } from "@/components/ui/loader";
import { Toaster } from "@/components/ui/toaster";
//import { Metadata } from 'next';
//import { sqlClient } from '@/lib/prismadb';

export default async function AuthLayout({
  children, // will be a page or nested layout
  params,
}: {
  children: React.ReactNode;
  params: { storeId: string };
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
