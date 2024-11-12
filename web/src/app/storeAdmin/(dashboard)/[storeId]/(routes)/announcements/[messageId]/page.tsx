import { sqlClient } from "@/lib/prismadb";
import { MessageEdit } from "./message-edit";

type Params = Promise<{ storeId: string; messageId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// here we save store settings to mangodb
//
export default async function MessageEditPage(props: {
  params: Params;
  searchParams: SearchParams;
}) {
  const params = await props.params;

  const obj = await sqlClient.storeAnnouncement.findUnique({
    where: {
      id: params.messageId,
    },
  });
  //console.log(`CategoryEditPage: ${JSON.stringify(obj)}`);

  let action = "Edit";
  if (obj === null) action = "New";

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <MessageEdit initialData={obj} action={action} />
      </div>
    </div>
  );
}
