import { handlers } from "@/auth";
import { isDemo } from "@/lib/demo";

// The demo has no database and no email sign-in, so Auth.js is off there.
const off = () => new Response("Not found", { status: 404 });

export const { GET, POST } = isDemo() ? { GET: off, POST: off } : handlers;
