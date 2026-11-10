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
  /** CodEORI. */
  eori?: string;
  /** AlboProfessionale, ProvinciaAlbo, NumeroIscrizioneAlbo, DataIscrizioneAlbo. */
  register?: { name?: string; province?: string; number?: string; date?: string };
  fax?: string;
  /** StabileOrganizzazione. */
  establishment?: Address;
  /** IscrizioneREA/CapitaleSociale. */
  shareCapital?: string;
  /** SocioUnico code: "SU" or "SM". */
  soleShareholder?: string;
  /** StatoLiquidazione code: "LS" or "LN". */
  liquidation?: string;
  /** RiferimentoAmministrazione. */
  adminRef?: string;
}

/** A party named only by its tax IDs: a fiscal representative, or the third party that issued the invoice. */
export interface OtherParty {
  role: "sellerRep" | "buyerRep" | "intermediary";
  name?: string;
  vat?: string;
  taxCode?: string;
  eori?: string;
}

export interface Transmission {
  /** IdTrasmittente as "IT01234567890". */
  senderId?: string;
  progressive?: string;
  format?: string;
  recipientCode?: string;
  recipientPec?: string;
  /** ContattiTrasmittente. */
  senderPhone?: string;
  senderEmail?: string;
  /** Root attribute SistemaEmittente: the software that made the file. */
  system?: string;
}

export interface Header {
  transmission: Transmission;
  seller: Party;
  buyer: Party;
  /** RappresentanteFiscale (of either party) and TerzoIntermediarioOSoggettoEmittente. */
  others: OtherParty[];
  /** SoggettoEmittente: "CC" (the customer) or "TZ" (a third party). */
  issuer?: string;
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
  /** Ritenuta "SI": the contribution is subject to withholding tax. */
  withholding?: boolean;
  adminRef?: string;
}

export interface DocRef {
  kind: "order" | "contract" | "agreement" | "receipt" | "linked";
  id?: string;
  date?: string;
  cup?: string;
  cig?: string;
  /** RiferimentoNumeroLinea: the invoice lines it refers to (none = the whole invoice). */
  lines?: string[];
  /** NumItem. */
  item?: string;
  /** CodiceCommessaConvenzione. */
  jobCode?: string;
}

export interface Ddt {
  number?: string;
  date?: string;
  lines?: string[];
}

/** DatiTrasporto. */
export interface Transport {
  carrier?: { name?: string; vat?: string; taxCode?: string; eori?: string; licence?: string };
  means?: string;
  reason?: string;
  packages?: string;
  description?: string;
  weightUnit?: string;
  grossWeight?: string;
  netWeight?: string;
  /** DataOraRitiro, DataOraConsegna: date and time as written. */
  pickup?: string;
  delivery?: string;
  start?: string;
  /** TipoResa (Incoterms code). */
  incoterms?: string;
  deliveryAddress?: Address;
}

/** AltriDatiGestionali: free data a line can carry. */
export interface LineExtra {
  type?: string;
  text?: string;
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
  /** TipoCessionePrestazione: "SC", "PR", "AB" or "AC". */
  kind?: string;
  /** Ritenuta "SI". */
  withholding?: boolean;
  adminRef?: string;
  extra: LineExtra[];
  /** Simplified invoice only: RiferimentoNormativo. */
  normRef?: string;
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
  /** DataRiferimentoTerminiPagamento and GiorniTerminiPagamento. */
  termsFrom?: string;
  termsDays?: string;
  postOffice?: string;
  /** Quietanzante: who collects a cash payment (title, name, surname) and their tax code. */
  receiptName?: string;
  receiptTaxCode?: string;
  abi?: string;
  cab?: string;
  /** ScontoPagamentoAnticipato and DataLimitePagamentoAnticipato. */
  earlyDiscount?: string;
  earlyLimit?: string;
  /** PenalitaPagamentiRitardati and DataDecorrenzaPenale. */
  latePenalty?: string;
  penaltyFrom?: string;
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
  /** Simplified invoice: the invoice it corrects (ElementiRettificati says what changed). */
  corrects?: { number?: string; date?: string; elements?: string };
  /** Art73 "SI". */
  art73?: boolean;
  /** DatiSAL/RiferimentoFase. */
  stages: string[];
  transport?: Transport;
  /** FatturaPrincipale. */
  mainInvoice?: { number?: string; date?: string };
  /** DatiVeicoli: Data and TotalePercorso. */
  vehicle?: { date?: string; distance?: string };
  lines: Line[];
  summaries: VatSummary[];
  payments: Payment[];
  attachments: Attachment[];
  /**
   * Fields of the XML (leaf elements with text, in the header or in this invoice's body) that did not
   * go into this model, so the view and the PDF cannot show them. An XML signature is not counted.
   */
  unshown: number;
}

export interface ParsedFile {
  /** Root versione attribute: "FPR12", "FPA12", "FSM10". */
  version?: string;
  header: Header;
  invoices: Invoice[];
  /** The XML carries its own ds:Signature (XAdES). Not verified. */
  xmlSigned: boolean;
}
