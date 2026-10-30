export type Errors = Record<string, string>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateClient(input: {
  email?: string;
  name: string;
}): Errors {
  const errors: Errors = {};
  if (!input.name.trim()) errors.name = "Name is required.";
  if (input.email?.trim() && !EMAIL_RE.test(input.email.trim())) {
    errors.email = "Enter a valid email address, or leave it blank.";
  }
  return errors;
}

export function validateInvoice(input: {
  amount: number;
  clientId: string;
  description: string;
  dueDate: string;
}): Errors {
  const errors: Errors = {};
  if (!input.clientId) errors.clientId = "Choose a client.";
  if (!input.description.trim()) errors.description = "Description is required.";
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    errors.amount = "Amount must be greater than 0.";
  }
  if (!input.dueDate) {
    errors.dueDate = "Due date is required.";
  } else if (!isValidDate(input.dueDate)) {
    errors.dueDate = "Due date must be a valid date.";
  }
  return errors;
}

export function isValidDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

/** Shared by the change-password form and its API route. */
export function validatePasswordChange(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.currentPassword) errors.currentPassword = "Enter your current password.";
  if (input.newPassword.length < 8) errors.newPassword = "New password must be at least 8 characters.";
  if (input.newPassword !== input.confirmPassword) errors.confirmPassword = "New passwords do not match.";
  return errors;
}
