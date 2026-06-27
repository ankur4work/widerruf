import { redirect, type LoaderFunctionArgs } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  throw redirect(qs ? `/auth/login?${qs}` : "/auth/login");
};

export default function Index() {
  return null;
}
