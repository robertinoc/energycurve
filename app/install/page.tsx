import type { Metadata } from "next"

import { InstallGuide } from "@/components/marketing/install-guide"

export const metadata: Metadata = {
  title: "Install the app",
  description:
    "Add EnergyCurve to your home screen and use it like a native app — no app store required.",
  alternates: {
    canonical: "/install",
  },
}

export default function InstallPage() {
  return <InstallGuide />
}
