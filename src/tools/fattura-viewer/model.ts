/**
 * The invoice as read from FatturaPA XML. Every value is the trimmed text of the XML element, kept as
 * a string (amounts too: "1234.50"), so nothing is lost before formatting. All of it is untrusted
 * input: render with textContent only.
 */

export interface Address {
  street?: string;
  number?: string;
  cap?: string;
  city?: string;
  province?: string;
  country?: string;
}

export interface Party {
  name?: string;
  /** "IT01234567890" (country + code). */
  vat?: string;
  taxCode?: string;
  /** RegimeFiscale code, e.g. "RF01". */
  regime?: string;
  address?: Address;
  phone?: string;
  email?: string;
  /** IscrizioneREA as "ME 123456". */
  rea?: string;
}

export interface Transmission {
  progressive?: string;
  format?: string;
  recipientCode?: string;
  recipientPec?: string;
}

export interface Header {
  transmission: Transmission;
  seller: Party;
  buyer: Party;
}

export interface Adjustment {
  /** "SC" discount, "MG" surcharge. */
  type?: string;
  percent?: string;
  amount?: string;
}

export interface Withholding {
  type?: string;
  amount?: string;
  rate?: string;
  /** CausalePagamento (Modello 770 code). */
  reason?: string;
}

export interface Stamp {
  /** BolloVirtuale "SI". */
  virtual: boolean;
  amount?: string;
}

export interface Fund {
  type?: string;
  rate?: string;
  amount?: string;
  taxable?: string;
  vatRate?: string;
  natura?: string;
}

export interface DocRef {
  kind: "order" | "contract" | "agreement" | "receipt" | "linked";
  id?: string;
  date?: string;
  cup?: string;
  cig?: string;
}

export interface Ddt {
  number?: string;
  date?: string;
}

export interface Line {
  number?: string;
  codes: { type?: string; value?: string }[];
  description?: string;
  quantity?: string;
  unit?: string;
  periodStart?: string;
  periodEnd?: string;
  unitPrice?: string;
  adjustments: Adjustment[];
  /** PrezzoTotale; for a simplified invoice, Importo (VAT included). */
  total?: string;
  vatRate?: string;
  /** Simplified invoice only: Imposta. */
  vatAmount?: string;
  natura?: string;
}

export interface VatSummary {
  vatRate?: string;
  natura?: string;
  taxable?: string;
  tax?: string;
  chargeability?: string;
  normRef?: string;
  expenses?: string;
  rounding?: string;
}

export interface PaymentDetail {
  method?: string;
  beneficiary?: string;
  dueDate?: string;
  amount?: string;
  iban?: string;
  bank?: string;
  bic?: string;
  code?: string;
}

export interface Payment {
  condition?: string;
  details: PaymentDetail[];
}

export interface Attachment {
  name?: string;
  format?: string;
  description?: string;
  compression?: string;
  /** Base64 as written in the XML (whitespace included). */
  data: string;
}

export interface Invoice {
  /** "ordinaria" (FPA12 / FPR12) or "semplificata" (FSM10). */
  kind: "ordinaria" | "semplificata";
  type?: string;
  currency: string;
  date?: string;
  number?: string;
  /** ImportoTotaleDocumento, or the sum worked out from the lines (see totalComputed). */
  total?: string;
  /** true when the XML has no total and `total` was added up here. */
  totalComputed: boolean;
  rounding?: string;
  reasons: string[];
  withholdings: Withholding[];
  stamp?: Stamp;
  funds: Fund[];
  adjustments: Adjustment[];
  refs: DocRef[];
  ddts: Ddt[];
  /** Simplified invoice: the invoice it corrects. */
  corrects?: { number?: string; date?: string };
  lines: Line[];
  summaries: VatSummary[];
  payments: Payment[];
  attachments: Attachment[];
}

export interface ParsedFile {
  /** Root versione attribute: "FPR12", "FPA12", "FSM10". */
  version?: string;
  header: Header;
  invoices: Invoice[];
  /** The XML carries its own ds:Signature (XAdES). Not verified. */
  xmlSigned: boolean;
}
