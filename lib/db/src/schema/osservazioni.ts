import { integer, numeric, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * Persistent observations shared by the tobacco NDVI calculator and the
 * grano duro nitrogen planner. New grain-planner columns stay nullable so
 * historical tobacco records remain valid.
 */
export const osservazioniTable = pgTable("osservazioni", {
  id: text("id").primaryKey(),
  data: text("data").notNull(),
  dataTrapianto: text("data_trapianto"),
  tipoIntervento: text("tipo_intervento").notNull(),
  giorni: integer("giorni").notNull(),
  etaPiantina: varchar("eta_piantina").notNull(),
  cliente: text("cliente").notNull(),
  appezzamento: text("appezzamento").notNull(),
  resa: numeric("resa").notNull(),
  varieta: text("varieta").notNull(),
  n1: numeric("n1").notNull(),
  n2: numeric("n2").notNull(),
  n3: numeric("n3").notNull(),
  n4: numeric("n4").notNull(),
  n5: numeric("n5").notNull(),
  media: numeric("media").notNull(),
  ottimale: numeric("ottimale").notNull(),
  discostamento: numeric("discostamento").notNull(),
  dose: numeric("dose").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }),
  lat: numeric("lat"),
  lng: numeric("lng"),
  densitaValore: numeric("piante_semi_ha"),
  densitaUnita: text("piante_semi_unita"),
  pianteHaEquivalenti: numeric("piante_ha_equivalenti"),
  faseFenologica: text("fase_fenologica"),
  bbch: text("bbch"),
  faseFonte: text("fase_fonte"),
  azotoTotale: numeric("azoto_totale"),
  azotoGiaDistribuito: numeric("azoto_gia_distribuito"),
  quotaAzoto: numeric("quota_azoto"),
});