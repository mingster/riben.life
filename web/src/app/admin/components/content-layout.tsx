import { AdminNavbar } from "./admin-navbar";

interface ContentLayoutProps {
  title: string;
  children: React.ReactNode;
}

export function ContentLayout({ title, children }: ContentLayoutProps) {
  return (
    <div>
      <AdminNavbar title={title} />
      <div className="container px-4 pb-8 pt-8 sm:px-8">{children}</div>
    </div>
  );
}
