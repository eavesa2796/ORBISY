/**
 * Template variable replacement for outreach messages
 * Supports: {{company}}, {{contact}}, {{city}}, {{sender}}, {{industry}}, {{website}}
 */

export interface TemplateVariables {
  company?: string;
  contact?: string;
  contactName?: string;
  city?: string;
  sender?: string;
  senderName?: string;
  industry?: string;
  website?: string;
  role?: string;
  phone?: string;
  [key: string]: string | undefined;
}

export function renderTemplate(
  template: string,
  variables: TemplateVariables
): string {
  let result = template;

  // Replace all {{variable}} patterns
  const regex = /\{\{(\w+)\}\}/g;
  result = result.replace(regex, (match, varName) => {
    const value = variables[varName];
    return value !== undefined && value !== null ? value : match;
  });

  return result;
}

export function getAvailableVariables(): string[] {
  return [
    "company",
    "contact",
    "contactName",
    "city",
    "sender",
    "senderName",
    "industry",
    "website",
    "role",
    "phone",
  ];
}

export function validateTemplate(template: string): {
  valid: boolean;
  unknownVariables: string[];
} {
  const regex = /\{\{(\w+)\}\}/g;
  const matches = Array.from(template.matchAll(regex));
  const usedVariables = matches.map((m) => m[1]);
  const available = getAvailableVariables();

  const unknownVariables = usedVariables.filter((v) => !available.includes(v));

  return {
    valid: unknownVariables.length === 0,
    unknownVariables,
  };
}
