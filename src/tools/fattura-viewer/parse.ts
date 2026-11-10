/**
 * FatturaPA XML reader: bytes -> text (BOM and the XML declaration's encoding), text -> Document
 * (DOMParser), Document -> ParsedFile. Elements are matched by localName only, so any prefix (p:,
 * ns2:, ns3:) or none works. Handles FatturaElettronica (FPA12 / FPR12, one or more bodies) and
 * FatturaElettronicaSemplificata (FSM10). Pure apart from DOMParser; tested under happy-dom.
 */
import type {
  Address,
  Adjustment,
  Attachment,
  DocRef,
  Header,
  Invoice,
  Line,
  OtherParty,
  ParsedFile,
  Party,
  Payment,
  Transport,
  VatSummary,
} from "./model";

export type FatturaErrorCode = "xml" | "not-invoice" | "empty";

export class FatturaError extends Error {
  constructor(public readonly code: FatturaErrorCode) {
    super(`fattura: ${code}`);
    this.name = "FatturaError";
  }
}

const DSIG = "http://www.w3.org/2000/09/xmldsig#";

// ---------- bytes -> text ----------

const LATIN1 = /^(iso[-_]?8859[-_]?1|latin[-_]?1|l1|windows[-_]?1252|cp1252|us-ascii|ascii)$/i;

function declaredEncoding(bytes: Uint8Array): string | undefined {
  let head = "";
  for (let i = 0; i < Math.min(bytes.length, 256); i++) head += String.fromCharCode(bytes[i]!);
  return /^\s*<\?xml[^>]*?encoding\s*=\s*["']([A-Za-z0-9._:-]+)["']/.exec(head)?.[1];
}

function decodeWith(label: string, bytes: Uint8Array, fatal: boolean): string {
  return new TextDecoder(label, { fatal }).decode(bytes);
}

/**
 * Text of an XML file: a BOM wins (UTF-8, UTF-16 LE/BE), then the declaration's encoding
 * (ISO-8859-1 and friends are read as windows-1252, its superset), else UTF-8. Bytes that are not
 * valid UTF-8 under a UTF-8 (or missing) declaration are read as windows-1252: a common mislabel.
 */
export function decodeXml(bytes: Uint8Array): string {
  const [a, b, c] = bytes;
  if (a === 0xef && b === 0xbb && c === 0xbf) return decodeWith("utf-8", bytes.subarray(3), false);
  if (a === 0xff && b === 0xfe) return decodeWith("utf-16le", bytes.subarray(2), false);
  if (a === 0xfe && b === 0xff) return decodeWith("utf-16be", bytes.subarray(2), false);
  const declared = declaredEncoding(bytes);
  if (declared && LATIN1.test(declared)) return decodeWith("windows-1252", bytes, false);
  if (declared && !/^utf-?8$/i.test(declared)) {
    try {
      return decodeWith(declared, bytes, false);
    } catch {
      // Unknown label: fall through to UTF-8.
    }
  }
  try {
    return decodeWith("utf-8", bytes, true);
  } catch {
    return decodeWith("windows-1252", bytes, false);
  }
}

// ---------- text -> Document ----------

/** Parse XML text; throws FatturaError("xml") when it is not well-formed. */
export function parseXml(text: string): Document {
  const clean = text.replace(/^[\ufeff\s]+/, "");
  if (!clean.startsWith("<")) throw new FatturaError("xml");
  const doc = new DOMParser().parseFromString(clean, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0 || doc.getElementsByTagNameNS("*", "parsererror").length > 0) {
    throw new FatturaError("xml");
  }
  return doc;
}

// ---------- element helpers (by localName) ----------

type El = Element | undefined;

const kids = (el: El, name: string): Element[] => (el ? Array.from(el.children).filter((c) => c.localName === name) : []);
const kid = (el: El, name: string): El => (el ? Array.from(el.children).find((c) => c.localName === name) : undefined);
const at = (el: El, path: string): El => path.split("/").reduce<El>((e, n) => kid(e, n), el);

/**
 * Leaf elements whose text went into the model, for the file being read (reading is synchronous, so
 * one set at a time is enough). Whatever is left is counted as not shown: see countUnshown().
 */
let taken = new Set<Element>();

/** Trimmed text of an element, undefined when missing or blank. Marks it as taken. */
function take(leaf: El): string | undefined {
  const v = leaf?.textContent?.trim();
  if (!leaf || !v) return undefined;
  taken.add(leaf);
  return v;
}
/** Trimmed text at `path`, undefined when missing or blank. */
const txt = (el: El, path: string): string | undefined => take(at(el, path));
/** Text of every `name` child that has some. */
const txts = (el: El, name: string): string[] => kids(el, name).flatMap((k) => take(k) ?? []);
const yes = (el: El, path: string): boolean => /^si$/i.test(txt(el, path) ?? "");
const some = <T>(list: T[]): T[] | undefined => (list.length ? list : undefined);

function compact<T extends object>(o: T): T | undefined {
  return Object.values(o).some((v) => v !== undefined) ? o : undefined;
}

// ---------- header ----------

function idFiscale(el: El): string | undefined {
  if (!el) return undefined;
  const country = txt(el, "IdPaese") ?? "";
  const code = txt(el, "IdCodice") ?? "";
  return country + code || undefined;
}

function address(el: El): Address | undefined {
  if (!el) return undefined;
  return compact({
    street: txt(el, "Indirizzo"),
    number: txt(el, "NumeroCivico"),
    cap: txt(el, "CAP"),
    city: txt(el, "Comune"),
    province: txt(el, "Provincia"),
    country: txt(el, "Nazione"),
  });
}

function personName(el: El): string | undefined {
  const name = txt(el, "Denominazione");
  if (name) return name;
  const parts = [txt(el, "Titolo"), txt(el, "Nome"), txt(el, "Cognome")].filter(Boolean);
  return parts.length ? parts.join(" ") : undefined;
}

/**
 * CedentePrestatore / CessionarioCommittente. Ordinary invoices nest the data in
 * DatiAnagrafici/Anagrafica; simplified ones put it directly in the party (seller) or in
 * IdentificativiFiscali + AltriDatiIdentificativi (buyer).
 */
function party(el: El): Party {
  if (!el) return {};
  const ids = kid(el, "DatiAnagrafici") ?? kid(el, "IdentificativiFiscali") ?? el;
  const other = kid(el, "AltriDatiIdentificativi");
  const ana = kid(ids, "Anagrafica") ?? other ?? ids;
  const rea = kid(el, "IscrizioneREA");
  const contacts = kid(el, "Contatti");
  return {
    name: personName(ana),
    vat: idFiscale(kid(ids, "IdFiscaleIVA")),
    taxCode: txt(ids, "CodiceFiscale"),
    regime: txt(ids, "RegimeFiscale") ?? txt(el, "RegimeFiscale"),
    address: address(kid(el, "Sede") ?? kid(other, "Sede")),
    phone: txt(contacts, "Telefono"),
    email: txt(contacts, "Email"),
    rea: rea ? [txt(rea, "Ufficio"), txt(rea, "NumeroREA")].filter(Boolean).join(" ") || undefined : undefined,
    eori: txt(ana, "CodEORI"),
    register: compact({
      name: txt(ids, "AlboProfessionale"),
      province: txt(ids, "ProvinciaAlbo"),
      number: txt(ids, "NumeroIscrizioneAlbo"),
      date: txt(ids, "DataIscrizioneAlbo"),
    }),
    fax: txt(contacts, "Fax"),
    establishment: address(kid(el, "StabileOrganizzazione") ?? kid(other, "StabileOrganizzazione")),
    shareCapital: txt(rea, "CapitaleSociale"),
    soleShareholder: txt(rea, "SocioUnico"),
    liquidation: txt(rea, "StatoLiquidazione"),
    adminRef: txt(el, "RiferimentoAmministrazione"),
  };
}

/** A fiscal representative or the third party that issued the invoice: tax IDs and a name, nothing else. */
function otherParty(el: El, role: OtherParty["role"]): OtherParty[] {
  if (!el) return [];
  const ids = kid(el, "DatiAnagrafici") ?? el;
  const ana = kid(ids, "Anagrafica") ?? ids;
  const p: OtherParty = {
    role,
    name: personName(ana),
    vat: idFiscale(kid(ids, "IdFiscaleIVA")),
    taxCode: txt(ids, "CodiceFiscale"),
    eori: txt(ana, "CodEORI"),
  };
  return p.name || p.vat || p.taxCode || p.eori ? [p] : [];
}

function header(el: El, root: Element): Header {
  const t = kid(el, "DatiTrasmissione");
  const contacts = kid(t, "ContattiTrasmittente");
  const seller = kid(el, "CedentePrestatore");
  const buyer = kid(el, "CessionarioCommittente");
  /** A party's own representative: a direct child, or inside AltriDatiIdentificativi (simplified buyer). */
  const repOf = (p: El) => kid(p, "RappresentanteFiscale") ?? kid(kid(p, "AltriDatiIdentificativi"), "RappresentanteFiscale");
  return {
    transmission: {
      senderId: idFiscale(kid(t, "IdTrasmittente")),
      progressive: txt(t, "ProgressivoInvio"),
      format: txt(t, "FormatoTrasmissione"),
      recipientCode: txt(t, "CodiceDestinatario"),
      recipientPec: txt(t, "PECDestinatario"),
      senderPhone: txt(contacts, "Telefono"),
      senderEmail: txt(contacts, "Email"),
      system: root.getAttribute("SistemaEmittente")?.trim() || undefined,
    },
    seller: party(seller),
    buyer: party(buyer),
    others: [
      // Ordinary invoices name the supplier's representative next to the supplier, simplified ones inside it.
      ...otherParty(kid(el, "RappresentanteFiscale") ?? repOf(seller), "sellerRep"),
      ...otherParty(repOf(buyer), "buyerRep"),
      ...otherParty(kid(el, "TerzoIntermediarioOSoggettoEmittente"), "intermediary"),
    ],
    issuer: txt(el, "SoggettoEmittente"),
  };
}

// ---------- body ----------

const adjustments = (el: El): Adjustment[] =>
  kids(el, "ScontoMaggiorazione").map((a) => ({ type: txt(a, "Tipo"), percent: txt(a, "Percentuale"), amount: txt(a, "Importo") }));

const attachments = (body: El): Attachment[] =>
  kids(body, "Allegati").map((a) => ({
    name: txt(a, "NomeAttachment"),
    format: txt(a, "FormatoAttachment"),
    description: txt(a, "DescrizioneAttachment"),
    compression: txt(a, "AlgoritmoCompressione"),
    // The data itself is offered as a download, so it counts as taken even when it is empty.
    data: take(at(a, "Attachment")) === undefined ? "" : (at(a, "Attachment")?.textContent ?? ""),
  }));

/** Cents as a "123.45" string. */
function fromCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** Sum of decimal strings in cents, as a "123.45" string; undefined if any is unreadable or none given. */
export function sumAmounts(values: (string | undefined)[]): string | undefined {
  let cents = 0;
  let any = false;
  for (const v of values) {
    if (v === undefined) continue;
    const n = Number(v);
    if (!Number.isFinite(n)) return undefined;
    cents += Math.round(n * 100);
    any = true;
  }
  return any ? fromCents(cents) : undefined;
}

/**
 * A total with the document's ScontoMaggiorazione applied, in file order: SC takes away, MG adds.
 * Importo is used as given; with no Importo, Percentuale is taken of the running total. An entry with
 * no readable type or figure changes nothing.
 */
export function applyAdjustments(total: string | undefined, list: Adjustment[]): string | undefined {
  if (total === undefined || !Number.isFinite(Number(total))) return total;
  let cents = Math.round(Number(total) * 100);
  for (const a of list) {
    const sign = a.type === "MG" ? 1 : a.type === "SC" ? -1 : 0;
    const change = a.amount !== undefined ? Number(a.amount) * 100 : a.percent !== undefined ? (cents * Number(a.percent)) / 100 : NaN;
    if (sign !== 0 && Number.isFinite(change)) cents += sign * Math.round(change);
  }
  return fromCents(cents);
}

function transport(el: El): Transport | undefined {
  if (!el) return undefined;
  const carrier = kid(el, "DatiAnagraficiVettore");
  const ana = kid(carrier, "Anagrafica") ?? carrier;
  return compact({
    carrier: compact({
      name: personName(ana),
      vat: idFiscale(kid(carrier, "IdFiscaleIVA")),
      taxCode: txt(carrier, "CodiceFiscale"),
      eori: txt(ana, "CodEORI"),
      licence: txt(carrier, "NumeroLicenzaGuida"),
    }),
    means: txt(el, "MezzoTrasporto"),
    reason: txt(el, "CausaleTrasporto"),
    packages: txt(el, "NumeroColli"),
    description: txt(el, "Descrizione"),
    weightUnit: txt(el, "UnitaMisuraPeso"),
    grossWeight: txt(el, "PesoLordo"),
    netWeight: txt(el, "PesoNetto"),
    pickup: txt(el, "DataOraRitiro"),
    start: txt(el, "DataInizioTrasporto"),
    incoterms: txt(el, "TipoResa"),
    deliveryAddress: address(kid(el, "IndirizzoResa")),
    delivery: txt(el, "DataOraConsegna"),
  });
}

const REF_KINDS: [string, DocRef["kind"]][] = [
  ["DatiOrdineAcquisto", "order"],
  ["DatiContratto", "contract"],
  ["DatiConvenzione", "agreement"],
  ["DatiRicezione", "receipt"],
  ["DatiFattureCollegate", "linked"],
];

function ordinaryBody(body: Element): Invoice {
  const gen = kid(body, "DatiGenerali");
  const doc = kid(gen, "DatiGeneraliDocumento");
  const goods = kid(body, "DatiBeniServizi");
  const bollo = kid(doc, "DatiBollo");
  const main = kid(gen, "FatturaPrincipale");
  const vehicle = kid(body, "DatiVeicoli");

  const lines: Line[] = kids(goods, "DettaglioLinee").map((l) => ({
    number: txt(l, "NumeroLinea"),
    codes: kids(l, "CodiceArticolo").map((c) => ({ type: txt(c, "CodiceTipo"), value: txt(c, "CodiceValore") })),
    description: txt(l, "Descrizione"),
    quantity: txt(l, "Quantita"),
    unit: txt(l, "UnitaMisura"),
    periodStart: txt(l, "DataInizioPeriodo"),
    periodEnd: txt(l, "DataFinePeriodo"),
    unitPrice: txt(l, "PrezzoUnitario"),
    adjustments: adjustments(l),
    total: txt(l, "PrezzoTotale"),
    vatRate: txt(l, "AliquotaIVA"),
    natura: txt(l, "Natura"),
    kind: txt(l, "TipoCessionePrestazione"),
    withholding: yes(l, "Ritenuta"),
    adminRef: txt(l, "RiferimentoAmministrazione"),
    extra: kids(l, "AltriDatiGestionali").map((d) => ({
      type: txt(d, "TipoDato"),
      text: txt(d, "RiferimentoTesto"),
      number: txt(d, "RiferimentoNumero"),
      date: txt(d, "RiferimentoData"),
    })),
  }));

  const summaries: VatSummary[] = kids(goods, "DatiRiepilogo").map((s) => ({
    vatRate: txt(s, "AliquotaIVA"),
    natura: txt(s, "Natura"),
    taxable: txt(s, "ImponibileImporto"),
    tax: txt(s, "Imposta"),
    chargeability: txt(s, "EsigibilitaIVA"),
    normRef: txt(s, "RiferimentoNormativo"),
    expenses: txt(s, "SpeseAccessorie"),
    rounding: txt(s, "Arrotondamento"),
  }));

  const payments: Payment[] = kids(body, "DatiPagamento").map((p) => ({
    condition: txt(p, "CondizioniPagamento"),
    details: kids(p, "DettaglioPagamento").map((d) => ({
      method: txt(d, "ModalitaPagamento"),
      beneficiary: txt(d, "Beneficiario"),
      dueDate: txt(d, "DataScadenzaPagamento"),
      amount: txt(d, "ImportoPagamento"),
      iban: txt(d, "IBAN"),
      bank: txt(d, "IstitutoFinanziario"),
      bic: txt(d, "BIC"),
      code: txt(d, "CodicePagamento"),
      termsFrom: txt(d, "DataRiferimentoTerminiPagamento"),
      termsDays: txt(d, "GiorniTerminiPagamento"),
      postOffice: txt(d, "CodUfficioPostale"),
      receiptName: [txt(d, "TitoloQuietanzante"), txt(d, "NomeQuietanzante"), txt(d, "CognomeQuietanzante")].filter(Boolean).join(" ") || undefined,
      receiptTaxCode: txt(d, "CFQuietanzante"),
      abi: txt(d, "ABI"),
      cab: txt(d, "CAB"),
      earlyDiscount: txt(d, "ScontoPagamentoAnticipato"),
      earlyLimit: txt(d, "DataLimitePagamentoAnticipato"),
      latePenalty: txt(d, "PenalitaPagamentiRitardati"),
      penaltyFrom: txt(d, "DataDecorrenzaPenale"),
    })),
  }));

  // ImportoTotaleDocumento is net of the document's own discount or surcharge, so a total added up
  // here from the VAT summary has to take it into account too.
  const docAdjustments = adjustments(doc);
  const declared = txt(doc, "ImportoTotaleDocumento");
  const computed = declared
    ? undefined
    : applyAdjustments(sumAmounts(summaries.flatMap((s) => [s.taxable, s.tax]).filter((v): v is string => v !== undefined)), docAdjustments);

  return {
    kind: "ordinaria",
    type: txt(doc, "TipoDocumento"),
    currency: txt(doc, "Divisa") ?? "EUR",
    date: txt(doc, "Data"),
    number: txt(doc, "Numero"),
    total: declared ?? computed,
    totalComputed: !declared && computed !== undefined,
    rounding: txt(doc, "Arrotondamento"),
    reasons: txts(doc, "Causale"),
    withholdings: kids(doc, "DatiRitenuta").map((r) => ({
      type: txt(r, "TipoRitenuta"),
      amount: txt(r, "ImportoRitenuta"),
      rate: txt(r, "AliquotaRitenuta"),
      reason: txt(r, "CausalePagamento"),
    })),
    stamp: bollo ? { virtual: /^si$/i.test(txt(bollo, "BolloVirtuale") ?? ""), amount: txt(bollo, "ImportoBollo") } : undefined,
    funds: kids(doc, "DatiCassaPrevidenziale").map((f) => ({
      type: txt(f, "TipoCassa"),
      rate: txt(f, "AlCassa"),
      amount: txt(f, "ImportoContributoCassa"),
      taxable: txt(f, "ImponibileCassa"),
      vatRate: txt(f, "AliquotaIVA"),
      natura: txt(f, "Natura"),
      withholding: yes(f, "Ritenuta") || undefined,
      adminRef: txt(f, "RiferimentoAmministrazione"),
    })),
    adjustments: docAdjustments,
    refs: REF_KINDS.flatMap(([tag, kind]) =>
      kids(gen, tag).map((r) => ({
        kind,
        id: txt(r, "IdDocumento"),
        date: txt(r, "Data"),
        cup: txt(r, "CodiceCUP"),
        cig: txt(r, "CodiceCIG"),
        lines: some(txts(r, "RiferimentoNumeroLinea")),
        item: txt(r, "NumItem"),
        jobCode: txt(r, "CodiceCommessaConvenzione"),
      })),
    ),
    ddts: kids(gen, "DatiDDT").map((d) => ({ number: txt(d, "NumeroDDT"), date: txt(d, "DataDDT"), lines: some(txts(d, "RiferimentoNumeroLinea")) })),
    art73: yes(doc, "Art73"),
    stages: kids(gen, "DatiSAL").flatMap((s) => txts(s, "RiferimentoFase")),
    transport: transport(kid(gen, "DatiTrasporto")),
    mainInvoice: compact({ number: txt(main, "NumeroFatturaPrincipale"), date: txt(main, "DataFatturaPrincipale") }),
    vehicle: compact({ date: txt(vehicle, "Data"), distance: txt(vehicle, "TotalePercorso") }),
    lines,
    summaries,
    payments,
    attachments: attachments(body),
    unshown: 0,
  };
}

function simplifiedBody(body: Element): Invoice {
  const gen = kid(body, "DatiGenerali");
  const doc = kid(gen, "DatiGeneraliDocumento");
  const fr = kid(gen, "DatiFatturaRettificata");
  const lines: Line[] = kids(body, "DatiBeniServizi").map((l) => ({
    codes: [],
    description: txt(l, "Descrizione"),
    adjustments: [],
    total: txt(l, "Importo"),
    vatRate: txt(l, "DatiIVA/Aliquota"),
    vatAmount: txt(l, "DatiIVA/Imposta"),
    natura: txt(l, "Natura"),
    extra: [],
    normRef: txt(l, "RiferimentoNormativo"),
  }));
  const total = sumAmounts(lines.map((l) => l.total));
  const bollo = txt(doc, "BolloVirtuale");
  return {
    kind: "semplificata",
    type: txt(doc, "TipoDocumento"),
    currency: txt(doc, "Divisa") ?? "EUR",
    date: txt(doc, "Data"),
    number: txt(doc, "Numero"),
    total,
    totalComputed: total !== undefined,
    reasons: [],
    withholdings: [],
    stamp: bollo ? { virtual: /^si$/i.test(bollo) } : undefined,
    funds: [],
    adjustments: [],
    refs: [],
    ddts: [],
    corrects: fr ? { number: txt(fr, "NumeroFR"), date: txt(fr, "DataFR"), elements: txt(fr, "ElementiRettificati") } : undefined,
    stages: [],
    lines,
    summaries: [],
    payments: [],
    attachments: attachments(body),
    unshown: 0,
  };
}

// ---------- Document -> ParsedFile ----------

const ROOTS = new Set(["FatturaElettronica", "FatturaElettronicaSemplificata"]);

function findRoot(doc: Document): Element | undefined {
  const root = doc.documentElement;
  if (root && ROOTS.has(root.localName)) return root;
  // Some tools wrap the invoice in another element: take the first invoice root anywhere.
  return Array.from(doc.getElementsByTagName("*")).find((e) => ROOTS.has(e.localName));
}

/**
 * For each body, how many fields of the file the reader did not take: leaf elements with text, in that
 * body or outside every body (the header is shared by all the invoices of a file). An XML signature is
 * left out: the view has its own note for it.
 */
function countUnshown(root: Element, bodies: Element[]): number[] {
  const perBody = bodies.map(() => 0);
  let shared = 0;
  for (const top of Array.from(root.children)) {
    if (top.localName === "Signature") continue;
    let n = 0;
    for (const e of [top, ...Array.from(top.getElementsByTagName("*"))]) {
      if (e.children.length === 0 && !taken.has(e) && e.textContent?.trim()) n++;
    }
    const i = bodies.indexOf(top);
    if (i >= 0) perBody[i]! += n;
    else shared += n;
  }
  return perBody.map((n) => n + shared);
}

/** Read the invoices in a parsed Document. Throws FatturaError("not-invoice") or ("empty"). */
export function readInvoices(doc: Document): ParsedFile {
  const root = findRoot(doc);
  if (!root) throw new FatturaError("not-invoice");
  const simplified = root.localName === "FatturaElettronicaSemplificata";
  const bodies = kids(root, "FatturaElettronicaBody");
  if (bodies.length === 0) throw new FatturaError("empty");
  taken = new Set();
  const head = header(kid(root, "FatturaElettronicaHeader"), root);
  const invoices = bodies.map(simplified ? simplifiedBody : ordinaryBody);
  countUnshown(root, bodies).forEach((n, i) => (invoices[i]!.unshown = n));
  taken = new Set(); // do not keep the document alive
  return {
    version: root.getAttribute("versione") ?? undefined,
    header: head,
    invoices,
    xmlSigned:
      root.getElementsByTagNameNS(DSIG, "Signature").length > 0 ||
      Array.from(root.children).some((c) => c.localName === "Signature"),
  };
}

/** bytes -> ParsedFile. Throws FatturaError. */
export function parseFattura(bytes: Uint8Array): ParsedFile {
  return readInvoices(parseXml(decodeXml(bytes)));
}

/** Does this look like XML at all (after an optional BOM and whitespace)? Cheap sniff for the intake. */
export function looksLikeXml(bytes: Uint8Array): boolean {
  let i = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0;
  if (bytes[0] === 0xff || bytes[0] === 0xfe) return true; // UTF-16 BOM
  while (i < bytes.length && i < 1024 && (bytes[i] === 0x20 || bytes[i] === 0x0a || bytes[i] === 0x0d || bytes[i] === 0x09)) i++;
  return bytes[i] === 0x3c; // "<"
}
