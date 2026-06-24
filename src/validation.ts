import { ApplicationStatus, CreateJobInput, UpdateJobInput } from "./types";

const VALID_STATUSES: ApplicationStatus[] = [
  "wishlist",
  "applied",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
];

type ValidationResult<T> =
  | { valid: true; data: T }
  | { valid: false; errors: string[] };

export const validateCreateJob = (
  body: unknown,
): ValidationResult<CreateJobInput> => {
  const errors: string[] = [];

  if (typeof body !== "object" || body === null) {
    return { valid: false, errors: ["Request body must be a JSON object"] };
  }

  const b = body as Record<string, unknown>;
  if (typeof b.company !== "string" || b.company.trim() === "") {
    errors.push("company is required and must be a non-empty string");
  }
  if (typeof b.role !== "string" || b.role.trim() === "") {
    errors.push("role is required and must be a non-empty string");
  }
  if (typeof b.appliedDate !== "string" || b.appliedDate.trim() === "") {
    errors.push("appliedDate is required and must be a non-empty string");
  }
  if (
    typeof b.status !== "string" ||
    !VALID_STATUSES.includes(b.status as ApplicationStatus)
  ) {
    errors.push(`status must be one of: ${VALID_STATUSES.join(", ")}`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }
  return {
    valid: true,
    data: {
      company: b.company as string,
      role: b.role as string,
      status: b.status as ApplicationStatus,
      appliedDate: b.appliedDate as string,
    },
  };
};

export const validateUpdateJob = (
  body: unknown,
): ValidationResult<UpdateJobInput> => {
  const errors: string[] = [];

  if (typeof body !== "object" || body === null) {
    return { valid: false, errors: ["Request body must be a JSON object"] };
  }

  const b = body as Record<string, unknown>;
  const allowedKeys = ["company", "role", "status", "appliedDate", "notes"];
  const providedKeys = Object.keys(b).filter((k) => allowedKeys.includes(k));
  if (providedKeys.length === 0) {
    return { valid: false, errors: ["Please update one of the fields"] };
  }

  if (b.company !== undefined) {
    if (typeof b.company !== "string" || b.company.trim() === "") {
      errors.push("company  must be a non-empty string");
    }
  }
  if (b.role !== undefined) {
    if (typeof b.role !== "string" || b.role.trim() === "") {
      errors.push("role must be a non-empty string");
    }
  }
  if (b.appliedDate !== undefined) {
    if (typeof b.appliedDate !== "string" || b.appliedDate.trim() === "") {
      errors.push("appliedDate must be a non-empty string");
    }
  }
  if (b.status !== undefined) {
    if (
      typeof b.status !== "string" ||
      !VALID_STATUSES.includes(b.status as ApplicationStatus) ||
      b.status.trim() === ""
    ) {
      errors.push(`status must be one of: ${VALID_STATUSES.join(", ")}`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const data: UpdateJobInput = {};
  if (b.company) data.company = b.company as string;
  if (b.role) data.role = b.role as string;
  if (b.status) data.status = b.status as ApplicationStatus;
  if (b.appliedDate) data.appliedDate = b.appliedDate as string;

  return {
    valid: true,
    data,
  };
};
