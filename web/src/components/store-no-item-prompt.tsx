import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";

const StoreNoItemPrompt = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <></>;

  return (
    <div>
      <h1 className="sm:text-xl text-2xl tracking-wider">目前無商品</h1>

      <Link href={"/"} className="hover:text-slate">
        <Button variant="outline" className="w-full">
          選購
        </Button>
      </Link>
    </div>
  );
};

export default StoreNoItemPrompt;
