import type { Metadata } from "next";
import { InternalAccessGate } from "@/app/_components/internal-access-gate";

export const metadata: Metadata = {
  title: "Accesso interno LexArmor",
  robots: {
    index: false,
    follow: false,
  },
};

export default function InternalAccessPage() {
  return <InternalAccessGate />;
}
