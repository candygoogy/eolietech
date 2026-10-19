/**
 * FatturaPA code tables with plain labels in Italian and English. Source: Agenzia delle Entrate,
 * "Specifiche tecniche" del formato FatturaPA, Allegato A versione 1.9 (31 January 2025, in force from
 * 1 April 2025: TD29 and RF20 added). Labels are short readable versions of the official wording, not
 * legal text. Codes no longer accepted by SdI (N2, N3, N6 without a subcode) stay so old invoices read.
 */
import type { Locale } from "../types";

type Table = Record<string, readonly [it: string, en: string]>;

export const TIPO_DOCUMENTO: Table = {
  TD01: ["Fattura", "Invoice"],
  TD02: ["Acconto o anticipo su fattura", "Advance payment on an invoice"],
  TD03: ["Acconto o anticipo su parcella", "Advance payment on a fee note"],
  TD04: ["Nota di credito", "Credit note"],
  TD05: ["Nota di debito", "Debit note"],
  TD06: ["Parcella", "Fee note"],
  TD07: ["Fattura semplificata", "Simplified invoice"],
  TD08: ["Nota di credito semplificata", "Simplified credit note"],
  TD09: ["Nota di debito semplificata", "Simplified debit note"],
  TD16: ["Integrazione fattura reverse charge interno", "Domestic reverse charge integration"],
  TD17: ["Integrazione o autofattura per acquisto di servizi dall'estero", "Integration or self-invoice for services bought abroad"],
  TD18: ["Integrazione per acquisto di beni intracomunitari", "Integration for goods bought in another EU country"],
  TD19: ["Integrazione o autofattura per acquisto di beni (art. 17 c. 2 DPR 633/72)", "Integration or self-invoice for goods (art. 17(2) DPR 633/72)"],
  TD20: ["Autofattura per regolarizzazione e integrazione delle fatture", "Self-invoice to regularise or integrate invoices"],
  TD21: ["Autofattura per splafonamento", "Self-invoice for going over the export ceiling"],
  TD22: ["Estrazione di beni da deposito IVA", "Goods taken out of a VAT warehouse"],
  TD23: ["Estrazione di beni da deposito IVA con versamento dell'IVA", "Goods taken out of a VAT warehouse, VAT paid"],
  TD24: ["Fattura differita (art. 21 c. 4 lett. a)", "Deferred invoice (art. 21(4)(a))"],
  TD25: ["Fattura differita (art. 21 c. 4 terzo periodo lett. b)", "Deferred invoice (art. 21(4), third sentence, (b))"],
  TD26: ["Cessione di beni ammortizzabili e passaggi interni", "Sale of depreciable assets or internal transfer"],
  TD27: ["Fattura per autoconsumo o cessioni gratuite senza rivalsa", "Self-supply or free supply without VAT recharge"],
  TD28: ["Acquisti da San Marino con IVA (fattura cartacea)", "Purchase from San Marino with VAT (paper invoice)"],
  TD29: ["Comunicazione per omessa o irregolare fatturazione", "Notice of a missing or irregular invoice"],
};

export const NATURA: Table = {
  N1: ["Escluse ex art. 15 DPR 633/72", "Excluded (art. 15 DPR 633/72)"],
  N2: ["Non soggette", "Outside the scope of VAT"],
  "N2.1": ["Non soggette, artt. da 7 a 7-septies DPR 633/72", "Outside the scope of VAT, arts. 7 to 7-septies DPR 633/72"],
  "N2.2": ["Non soggette, altri casi", "Outside the scope of VAT, other cases"],
  N3: ["Non imponibili", "Zero rated"],
  "N3.1": ["Non imponibili, esportazioni", "Zero rated, exports"],
  "N3.2": ["Non imponibili, cessioni intracomunitarie", "Zero rated, supplies to other EU countries"],
  "N3.3": ["Non imponibili, cessioni verso San Marino", "Zero rated, supplies to San Marino"],
  "N3.4": ["Non imponibili, operazioni assimilate alle esportazioni", "Zero rated, treated as exports"],
  "N3.5": ["Non imponibili, a seguito di dichiarazione d'intento", "Zero rated, under a declaration of intent"],
  "N3.6": ["Non imponibili, altre operazioni che non concorrono al plafond", "Zero rated, other supplies outside the ceiling"],
  N4: ["Esenti", "Exempt"],
  N5: ["Regime del margine, IVA non esposta in fattura", "Margin scheme, VAT not shown"],
  N6: ["Inversione contabile", "Reverse charge"],
  "N6.1": ["Inversione contabile, rottami e materiali di recupero", "Reverse charge, scrap and recovered materials"],
  "N6.2": ["Inversione contabile, oro e argento", "Reverse charge, gold and silver"],
  "N6.3": ["Inversione contabile, subappalto nel settore edile", "Reverse charge, building subcontracting"],
  "N6.4": ["Inversione contabile, cessione di fabbricati", "Reverse charge, sale of buildings"],
  "N6.5": ["Inversione contabile, telefoni cellulari", "Reverse charge, mobile phones"],
  "N6.6": ["Inversione contabile, prodotti elettronici", "Reverse charge, electronic products"],
  "N6.7": ["Inversione contabile, comparto edile e settori connessi", "Reverse charge, building and related services"],
  "N6.8": ["Inversione contabile, settore energetico", "Reverse charge, energy sector"],
  "N6.9": ["Inversione contabile, altri casi", "Reverse charge, other cases"],
  N7: ["IVA assolta in un altro Stato UE", "VAT paid in another EU country"],
};

export const MODALITA_PAGAMENTO: Table = {
  MP01: ["Contanti", "Cash"],
  MP02: ["Assegno", "Cheque"],
  MP03: ["Assegno circolare", "Banker's draft"],
  MP04: ["Contanti presso Tesoreria", "Cash at the Treasury"],
  MP05: ["Bonifico", "Bank transfer"],
  MP06: ["Vaglia cambiario", "Promissory note"],
  MP07: ["Bollettino bancario", "Bank payment slip"],
  MP08: ["Carta di pagamento", "Payment card"],
  MP09: ["RID", "RID direct debit"],
  MP10: ["RID utenze", "RID utility direct debit"],
  MP11: ["RID veloce", "Fast RID direct debit"],
  MP12: ["RiBa", "RiBa bank receipt"],
  MP13: ["MAV", "MAV payment notice"],
  MP14: ["Quietanza erario", "Treasury receipt"],
  MP15: ["Giroconto su conti di contabilità speciale", "Transfer to a special accounting account"],
  MP16: ["Domiciliazione bancaria", "Bank direct debit"],
  MP17: ["Domiciliazione postale", "Post office direct debit"],
  MP18: ["Bollettino di c/c postale", "Postal payment slip"],
  MP19: ["SEPA Direct Debit", "SEPA Direct Debit"],
  MP20: ["SEPA Direct Debit CORE", "SEPA Direct Debit CORE"],
  MP21: ["SEPA Direct Debit B2B", "SEPA Direct Debit B2B"],
  MP22: ["Trattenuta su somme già riscosse", "Deducted from sums already collected"],
  MP23: ["PagoPA", "PagoPA"],
};

export const CONDIZIONI_PAGAMENTO: Table = {
  TP01: ["Pagamento a rate", "Payment in instalments"],
  TP02: ["Pagamento completo", "Payment in full"],
  TP03: ["Anticipo", "Advance payment"],
};

export const REGIME_FISCALE: Table = {
  RF01: ["Ordinario", "Ordinary"],
  RF02: ["Contribuenti minimi", "Minimum taxpayers scheme"],
  RF04: ["Agricoltura, attività connesse e pesca", "Agriculture, related activities and fishing"],
  RF05: ["Vendita sali e tabacchi", "Salt and tobacco sales"],
  RF06: ["Commercio dei fiammiferi", "Match sales"],
  RF07: ["Editoria", "Publishing"],
  RF08: ["Gestione servizi di telefonia pubblica", "Public telephone services"],
  RF09: ["Rivendita documenti di trasporto pubblico e di sosta", "Resale of public transport and parking tickets"],
  RF10: ["Intrattenimenti, giochi e altre attività (DPR 640/72)", "Entertainment, gaming and other activities (DPR 640/72)"],
  RF11: ["Agenzie di viaggi e turismo", "Travel and tourism agencies"],
  RF12: ["Agriturismo", "Farm holidays (agriturismo)"],
  RF13: ["Vendite a domicilio", "Door to door sales"],
  RF14: ["Rivendita di beni usati, oggetti d'arte, antiquariato o collezione", "Resale of used goods, art, antiques or collectibles"],
  RF15: ["Vendite all'asta di oggetti d'arte, antiquariato o collezione", "Auctions of art, antiques or collectibles"],
  RF16: ["IVA per cassa P.A.", "Cash accounting VAT, public bodies"],
  RF17: ["IVA per cassa", "Cash accounting VAT"],
  RF18: ["Altro", "Other"],
  RF19: ["Regime forfettario", "Flat rate scheme (forfettario)"],
  RF20: ["Regime transfrontaliero di franchigia IVA", "Cross-border VAT exemption scheme"],
};

export const TIPO_RITENUTA: Table = {
  RT01: ["Ritenuta persone fisiche", "Withholding, individuals"],
  RT02: ["Ritenuta persone giuridiche", "Withholding, companies"],
  RT03: ["Contributo INPS", "INPS contribution"],
  RT04: ["Contributo ENASARCO", "ENASARCO contribution"],
  RT05: ["Contributo ENPAM", "ENPAM contribution"],
  RT06: ["Altro contributo previdenziale", "Other social security contribution"],
};

/** Pension funds: proper names, the same in both languages. */
const fund = (name: string) => [name, name] as const;
export const TIPO_CASSA: Table = {
  TC01: fund("Cassa forense, avvocati"),
  TC02: fund("Cassa dottori commercialisti"),
  TC03: fund("Cassa geometri"),
  TC04: fund("Inarcassa, ingegneri e architetti"),
  TC05: fund("Cassa del notariato"),
  TC06: fund("Cassa ragionieri e periti commerciali"),
  TC07: fund("ENASARCO"),
  TC08: fund("ENPACL"),
  TC09: fund("ENPAM"),
  TC10: fund("ENPAF"),
  TC11: fund("ENPAV"),
  TC12: fund("ENPAIA"),
  TC13: fund("Fondo imprese di spedizione e agenzie marittime"),
  TC14: fund("INPGI"),
  TC15: fund("ONAOSI"),
  TC16: fund("CASAGIT"),
  TC17: fund("EPPI"),
  TC18: fund("EPAP"),
  TC19: fund("ENPAB"),
  TC20: fund("ENPAPI"),
  TC21: fund("ENPAP"),
  TC22: fund("INPS"),
};

export const ESIGIBILITA_IVA: Table = {
  I: ["Immediata", "Immediate"],
  D: ["Differita", "Deferred"],
  S: ["Scissione dei pagamenti", "Split payment"],
};

/** The label for a code, or undefined when the code is not in the table. */
export function codeLabel(table: Table, code: string | undefined, locale: Locale): string | undefined {
  if (!code) return undefined;
  const entry = Object.hasOwn(table, code) ? table[code] : undefined;
  return entry ? entry[locale === "it" ? 0 : 1] : undefined;
}

/** "Bonifico (MP05)"; the raw code alone when unknown; undefined when there is no code. */
export function describeCode(table: Table, code: string | undefined, locale: Locale): string | undefined {
  if (!code) return undefined;
  const label = codeLabel(table, code, locale);
  return label ? `${label} (${code})` : code;
}
