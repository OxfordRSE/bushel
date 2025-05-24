import { DataError, DataRowCheck } from "@/lib/DataRowParser";
import { fuzzyCoerce } from "@/lib/utils";

export const selectValuesCheck: DataRowCheck<never> = {
  name: "Check Select values",
  async run(parser, emit) {
    if (emit({ status: "in_progress" })) return;

    if (!parser.data) {
      emit({ status: "skipped", details: "No data to check" });
      return;
    }

    for (const key in parser.data) {
      const field = parser.fields.find((f) => f.name === key);
      const options =
        field?.internal_settings?.options ?? field?.settings?.options;
      if (!options) continue;
      const value = parser.data[key];
      const vv = value instanceof Array ? value.flat() : [String(value)];
      for (let i = 0; i < vv.length; i++) {
        const v = String(vv[i]);
        const fuzzy = fuzzyCoerce(v, options);
        if (!options.includes(fuzzy)) {
          if (
            emit({
              status: "failed",
              error: new DataError(
                `${v} is not a valid option for ${key}`,
                "InvalidOptionError",
              ),
            })
          )
            return;
        } else if (fuzzy !== v) {
          if (Array.isArray(parser.data[key])) parser.data[key][i] = fuzzy;
          else parser.data[key] = fuzzy;
          if (
            emit({
              status: "in_progress",
              details: `Coerced "${v}" to "${fuzzy}"`,
            })
          )
            return;
        }
      }
    }

    emit({
      status: "success",
      details: "All select fields have legitimate values",
    });
  },
};
