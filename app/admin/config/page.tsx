import { notFound } from "next/navigation";

import { AdminConfigForm } from "@/components/admin/AdminConfigForm";
import { getAdminConfig } from "@/lib/server/admin-config";

export default async function AdminConfigPage() {
  const config = await getAdminConfig();

  if (!config) {
    notFound();
  }

  return <AdminConfigForm initialConfig={config} />;
}
