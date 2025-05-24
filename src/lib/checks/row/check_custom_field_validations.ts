import { DataError, DataRowCheck } from "@/lib/DataRowParser";

export const customFieldValidationCheck: DataRowCheck<never> = {
  name: "Check Custom Field Validations",
  async run(parser, emit) {
    if (emit({ status: "in_progress" })) return;

    if (!parser.data) {
      emit({ status: "skipped", details: "No data to check" });
      return;
    }

    for (const key in parser.data) {
      const field = parser.fields.find((f) => f.name === key);
      const validations = field?.settings?.validations;
      if (!validations) continue;
      // Non-required fields with no value are skipped
      if (
        !field?.is_mandatory &&
        (parser.data[key] === undefined ||
          parser.data[key] === null ||
          parser.data[key] === "")
      ) {
        continue;
      }
      const value = parser.data[key];
      if (
        (validations.min_length || validations.max_length) &&
        typeof value !== "string" &&
        !Array.isArray(value)
      ) {
        emit({
          status: "failed",
          error: new DataError(
            `Field "${key}" must be a string or an array to apply length validations.`,
            "InvalidTypeError",
          ),
        });
        return;
      }
      // @ts-expect-error we know value is a string or an array from the previous check
      if (validations.min_length && value.length < validations.min_length) {
        emit({
          status: "failed",
          error: new DataError(
            `Field "${key}" is too short. Minimum length is ${validations.min_length}.`,
            "CustomFieldValidationError",
          ),
        });
        return;
      }
      // @ts-expect-error we still know value is a string or an array from the previous check
      if (validations.max_length && value.length > validations.max_length) {
        emit({
          status: "failed",
          error: new DataError(
            `Field "${key}" is too long. Maximum length is ${validations.max_length}.`,
            "CustomFieldValidationError",
          ),
        });
        return;
      }
    }

    emit({
      status: "success",
      details: "All custom field validations passed.",
    });
  },
};
