/** SEC /api/xbrl/companyfacts response (subset). */
export type SecCompanyFactsApi = {
  cik: number;
  entityName?: string;
  facts?: Record<
    string,
    Record<
      string,
      {
        label?: string;
        description?: string;
        units?: Record<string, SecFactUnit[]>;
      }
    >
  >;
};

export type SecFactUnit = {
  end?: string;
  start?: string;
  val: number;
  accn?: string;
  fy?: number;
  fp?: string;
  form?: string;
  filed?: string;
  frame?: string;
};

export type SecEdgarMetricRow = {
  cik: string;
  ticker: string | null;
  taxonomy: string;
  concept: string;
  label: string | null;
  period_end: string;
  value: number;
  unit: string;
  form: string | null;
  filed: string | null;
  fiscal_year: number | null;
  fiscal_period: string | null;
  accession: string | null;
};
