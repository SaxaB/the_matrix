/**
 * Shim de compatibilidad del port Matrix → the_matrix.
 * El contrato real vive en packages/db (tipos generados a mano desde las
 * migraciones). Las tablas están ahora en los schemas `market` y `finance`,
 * no en `public`: los call sites usan `.schema("market"|"finance").from(...)`.
 */
export type { Database, Json } from "@matrix/db/types";
