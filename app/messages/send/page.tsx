import { SendMessageForm } from "@/components/messages/SendMessageForm";
import { getMessageSendData } from "@/lib/server/messages";

export default async function SendMessagePage() {
  const { users, userRole } = await getMessageSendData();

  return <SendMessageForm users={users} userRole={userRole} />;
}
