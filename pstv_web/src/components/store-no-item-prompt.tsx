import Link from "next/link";

const StoreNoItemPrompt = () => {
  return (
    <div>
      <h1 className="sm:text-[18px] text-[14px] tracking-wider">目前無商品</h1>
      <Link href={"/"} className="hover:text-slate">
        選購
      </Link>
    </div>
  );
};

export default StoreNoItemPrompt;
