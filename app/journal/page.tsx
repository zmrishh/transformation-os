import type { Metadata } from "next"
import { JournalClient } from "./journal-client"

export const metadata: Metadata = {
  title: "Journal — Transformation OS",
  description: "Your daily transformation notes.",
}

export default function JournalPage() {
  return <JournalClient />
}
