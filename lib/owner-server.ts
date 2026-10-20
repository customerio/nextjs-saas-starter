import "server-only";

import type { Session } from "next-auth";

import { getCustomerioConfig } from "@/lib/customerio/config";
import { isDemo } from "@/lib/demo";
import { ownerAccess, type OwnerAccess } from "@/lib/flows/owner";

export function ownerAccessFor(session: Session | null): OwnerAccess {
  // In the demo, every visitor may open /status to see the setup screens.
  if (isDemo()) return session?.user ? "owner" : "not_owner";
  return ownerAccess({
    ownerEmail: getCustomerioConfig().ownerEmail,
    signedInEmail: session?.user?.email,
    isDev: process.env.NODE_ENV === "development",
  });
}
