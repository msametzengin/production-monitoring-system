type ExcelExportLinkProps = {
  resource: "production" | "targets" | "downtimes";
  values: Record<string, string>;
  disabled?: boolean;
};

export function ExcelExportLink({
  resource,
  values,
  disabled = false,
}: ExcelExportLinkProps) {
  const href =
    "/api/exports/" +
    resource +
    "?" +
    new URLSearchParams(values).toString();

  const className =
    "rounded-lg border border-emerald-500/40 px-4 py-2.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/10";

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        title="Önce filtre hatasını düzeltin."
        className={
          className + " cursor-not-allowed opacity-50"
        }
      >
        Excel’e aktar
      </span>
    );
  }

  return (
    <a href={href} download className={className}>
      Excel’e aktar
    </a>
  );
}