import "server-only";

import type { Session } from "next-auth";

import { getCustomerioConfig } from "@/lib/customerio/config";
import { ownerAccess, type OwnerAccess } from "@/lib/flows/owner";

export function ownerAccessFor(session: Session | null): OwnerAccess {
  return ownerAccess({
    ownerEmail: getCustomerioConfig().ownerEmail,
    signedInEmail: session?.user?.email,
    isDev: process.env.NODE_ENV === "development",
  });
}
