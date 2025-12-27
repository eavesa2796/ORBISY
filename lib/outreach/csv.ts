/**
 * CSV parsing and export utilities for outreach leads
 */

export interface LeadCsvRow {
  company: string;
  contactName: string;
  role?: string;
  email?: string;
  phone?: string;
  website?: string;
  city?: string;
  industry?: string;
  score?: number;
  tags?: string;
  notes?: string;
}

/**
 * Parse CSV text into lead objects
 * Expected columns: company, contactName, role, email, phone, website, city, industry, score, tags, notes
 */
export function parseCsv(csvText: string): {
  leads: LeadCsvRow[];
  errors: string[];
} {
  const lines = csvText.trim().split("\n");
  if (lines.length === 0) {
    return { leads: [], errors: ["CSV is empty"] };
  }

  const headerLine = lines[0];
  const headers = headerLine.split(",").map((h) => h.trim().toLowerCase());

  const requiredFields = ["company", "contactname"];
  const missingFields = requiredFields.filter((f) => !headers.includes(f));

  if (missingFields.length > 0) {
    return {
      leads: [],
      errors: [`Missing required columns: ${missingFields.join(", ")}`],
    };
  }

  const leads: LeadCsvRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCsvLine(line);
    if (values.length !== headers.length) {
      errors.push(`Line ${i + 1}: Column count mismatch`);
      continue;
    }

    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx];
    });

    const lead: LeadCsvRow = {
      company: row.company || "",
      contactName: row.contactname || "",
      role: row.role || undefined,
      email: row.email || undefined,
      phone: row.phone || undefined,
      website: row.website || undefined,
      city: row.city || undefined,
      industry: row.industry || undefined,
      score: row.score ? parseInt(row.score, 10) : undefined,
      tags: row.tags || undefined,
      notes: row.notes || undefined,
    };

    if (!lead.company || !lead.contactName) {
      errors.push(
        `Line ${i + 1}: Missing required fields (company, contactName)`
      );
      continue;
    }

    leads.push(lead);
  }

  return { leads, errors };
}

/**
 * Parse a single CSV line handling quoted fields
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      // Check for escaped quote
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Export leads to CSV format
 */
export function exportToCsv(leads: LeadCsvRow[]): string {
  const headers = [
    "company",
    "contactName",
    "role",
    "email",
    "phone",
    "website",
    "city",
    "industry",
    "score",
    "tags",
    "notes",
  ];

  const rows = [headers.join(",")];

  for (const lead of leads) {
    const row = [
      escapeCsvField(lead.company),
      escapeCsvField(lead.contactName),
      escapeCsvField(lead.role || ""),
      escapeCsvField(lead.email || ""),
      escapeCsvField(lead.phone || ""),
      escapeCsvField(lead.website || ""),
      escapeCsvField(lead.city || ""),
      escapeCsvField(lead.industry || ""),
      lead.score?.toString() || "",
      escapeCsvField(lead.tags || ""),
      escapeCsvField(lead.notes || ""),
    ];
    rows.push(row.join(","));
  }

  return rows.join("\n");
}

function escapeCsvField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}
