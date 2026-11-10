import type { Observation } from "../App";
import { t } from "../i18n/runtime";
import { canDeleteObservation } from "../utils/observationDeletion";

export type ObservationDeletionProps = {
  onDelete?: (id: string) => void;
  deletionNow?: number;
  deletingId?: string | null;
};

export function ObservationDeleteButton({
  observation, onDelete, deletionNow, deletingId,
}: ObservationDeletionProps & { observation: Observation }) {
  const allowed = canDeleteObservation(observation.createdAt, deletionNow);
  const reason = !observation.createdAt || !Number.isFinite(Date.parse(observation.createdAt))
    ? t("Data di creazione non disponibile: cancellazione non consentita.")
    : t("Cancellazione consentita solo entro 24 ore dalla creazione.");
  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => onDelete?.(observation.id)}
        disabled={!allowed || !onDelete || !!deletingId}
        title={allowed ? t("Elimina entro 24 ore") : reason}
        aria-label={t("Elimina rilievo {0}").replace("{0}", observation.id)}
        className="min-h-11 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-stone-200 disabled:text-stone-400"
      >
        {deletingId === observation.id ? t("Eliminazione in corso…") : t("Elimina entro 24 ore")}
      </button>
      {!allowed && <span className="max-w-56 text-[11px] text-stone-500">{reason}</span>}
    </div>
  );
}
