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
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate) || Number.isNaN(Date.parse(input.dueDate))) {
    errors.dueDate = "Due date must be a valid date.";
  }
  return errors;
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}
