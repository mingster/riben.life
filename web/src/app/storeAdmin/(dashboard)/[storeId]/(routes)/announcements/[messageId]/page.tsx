import { sqlClient } from "@/lib/prismadb";
import { MessageEdit } from "./message-edit";

const MessageEditPage = async ({
  params,
}: { params: { storeId: string; messageId: string } }) => {
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
};

export default MessageEditPage;
