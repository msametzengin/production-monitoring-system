import Link from "next/link";

type FilterOption = {
  value: string;
  label: string;
};

type FilterField = {
  name: string;
  label: string;
  type: "text" | "date" | "select";
  placeholder?: string;
  options?: FilterOption[];
};

type RecordFiltersProps = {
  action: string;
  values: Record<string, string>;
  fields: FilterField[];
  error?: string | null;
};

const inputClassName =
  "mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-500";

export function RecordFilters({
  action,
  values,
  fields,
  error,
}: RecordFiltersProps) {
  return (
    <form
      key={JSON.stringify(values)}
      action={action}
      method="get"
      aria-label="Kayıt filtreleri"
      className="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-5"
    >
      <h2 className="mb-4 text-sm font-semibold text-slate-200">
        Arama ve filtreleme
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {fields.map((field) => {
          const inputId = `filter-${field.name}`;

          return (
            <div key={field.name}>
              <label
                htmlFor={inputId}
                className="text-sm text-slate-400"
              >
                {field.label}
              </label>

              {field.type === "select" ? (
                <select
                  id={inputId}
                  name={field.name}
                  defaultValue={values[field.name] ?? ""}
                  className={inputClassName}
                >
                  {field.options?.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={inputId}
                  name={field.name}
                  type={field.type}
                  defaultValue={values[field.name] ?? ""}
                  placeholder={field.placeholder}
                  maxLength={
                    field.type === "text" ? 100 : undefined
                  }
                  min={
                    field.type === "date"
                      ? "1000-01-01"
                      : undefined
                  }
                  max={
                    field.type === "date"
                      ? "9999-12-31"
                      : undefined
                  }
                  className={inputClassName}
                />
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Sonuçlar ve kayıt sayıları seçilen filtrelere göredir.
        </p>

        <div className="flex items-center gap-3">
          <Link
            href={action}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
          >
            Temizle
          </Link>

          <button
            type="submit"
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400"
          >
            Filtrele
          </button>
        </div>
      </div>
    </form>
  );
}