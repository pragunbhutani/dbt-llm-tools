import { redirect } from "next/navigation";

export default function RetiredChatPage() {
  redirect("/dashboard/conversations");
}
