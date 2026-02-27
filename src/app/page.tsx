import { redirect } from "next/navigation";
import { routing } from "@/i18n/routing";

// Root page redirects to the default locale.
// The middleware normally handles this, but this is a fallback.
export default function RootPage() {
  redirect(`/${routing.defaultLocale}`);
}
