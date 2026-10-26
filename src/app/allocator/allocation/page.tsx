"use client";

import { SectionPage } from "@/components/allocator/section-page";
import { NewAllocationButton } from "@/components/allocator/page-header";
import { RunAllocationContent } from "@/app/allocator/allocation/run/page";
import { FeeReviewContent } from "@/app/allocator/fees/review/page";
import { AllocationHistoryContent } from "@/app/allocator/allocation/history/page";

export default function AllocationPage() {
  return (
    <SectionPage
      title="Allocation"
      description="Review fee calculations, run allocations, and view history."
      defaultTab="run"
      action={<NewAllocationButton />}
      tabs={[
        { id: "run", label: "Run" },
        { id: "review", label: "Fee Review" },
        { id: "history", label: "History" },
      ]}
    >
      {(tab) => {
        switch (tab) {
          case "review":
            return <FeeReviewContent embedded />;
          case "history":
            return <AllocationHistoryContent embedded />;
          default:
            return <RunAllocationContent embedded />;
        }
      }}
    </SectionPage>
  );
}
