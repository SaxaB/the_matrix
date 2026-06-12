import { unstable_cache } from "next/cache";
import {
  fetchFinvizEconomicEntries,
  type FinvizEconomicEntry,
} from "@/lib/market/finviz-economic-calendar";

type Cached = {
  ok: boolean;
  entries: FinvizEconomicEntry[];
  error?: string;
};

/**
 * Finviz payload is identical for all users; cache ~1h to limit outbound calls on Vercel.
 */
export const getCachedFinvizEconomicCalendar = unstable_cache(
  async (): Promise<Cached> => fetchFinvizEconomicEntries(),
  ["finviz-economic-calendar-v1"],
  { revalidate: 3600 }
);
