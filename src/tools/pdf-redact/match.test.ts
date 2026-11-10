import { describe, expect, it } from "vitest";
import type { TextPiece } from "./geometry";
import { findPattern, findQuery, ibanValid, joinText, noteBoxes, rangeBoxes, readNotes, type PatternId } from "./match";

const found = (text: string, id: PatternId) => findPattern(text, id).map((r) => text.slice(r.start, r.end));

describe("typed search", () => {
  it("ignores case and lets a space match a line break or nothing", () => {
    const text = "Mario ROSSI, born in Rome.\nmario\nrossi again: MarioRossi";
    expect(findQuery(text, "  mario rossi ").map((r) => text.slice(r.start, r.end))).toEqual(["Mario ROSSI", "mario\nrossi", "MarioRossi"]);
    expect(findQuery(text, "a.b(c")).toEqual([]);
    expect(findQuery(text, "   ")).toEqual([]);
  });

  it("finds a word split over two lines, with or without a hyphen", () => {
    const text = "the Berlus-\nconi case, Berlusconi again, Berlus\nconi once more";
    expect(findQuery(text, "berlusconi").map((r) => text.slice(r.start, r.end))).toEqual(["Berlus-\nconi", "Berlusconi", "Berlus\nconi"]);
    // A short word breaks only at a hyphen: "to" is not the end of "not" plus the start of "over".
    const short = "not\nover, to-\nday";
    expect(findQuery(short, "to").map((r) => short.slice(r.start, r.end))).toEqual(["to"]);
    expect(findQuery(short, "today").map((r) => short.slice(r.start, r.end))).toEqual(["to-\nday"]);
  });
});

describe("personal data patterns", () => {
  it("finds email addresses", () => {
    expect(found("Write to mario.rossi+fatture@studio-legale.it or info@example.co.uk.", "email")).toEqual([
      "mario.rossi+fatture@studio-legale.it",
      "info@example.co.uk",
    ]);
  });

  it("finds phone numbers in the usual Italian and international shapes", () => {
    const text = "Tel. +39 333 123 4567, fisso 06 1234 5678, (02) 1234567, cell 3331234567, 0039 06 12345678, US (555) 123-4567";
    expect(found(text, "phone")).toEqual([
      "+39 333 123 4567",
      "06 1234 5678",
      "(02) 1234567",
      "3331234567",
      "0039 06 12345678",
      "(555) 123-4567",
    ]);
    expect(found("Tel 06 1234567 06 7654321", "phone")).toEqual(["06 1234567", "06 7654321"]);
    expect(found("IBAN: IT60 X054 2811 1010 0000 0123 456, tel 333 1234567", "phone")).toEqual(["333 1234567"]);
  });

  it("leaves dates, amounts, invoice numbers and IBAN digits alone", () => {
    expect(found("Data 2024-01-31, 31/12/2024, 31.01.2024, totale 1.234.567,00 euro, fattura 12345678", "phone")).toEqual([]);
    expect(found("IBAN IT60X0542811101000000123456 CF RSSMRA85T10A562S", "phone")).toEqual([]);
  });

  it("finds IBANs, spaced or not, and stops where the IBAN ends", () => {
    expect(ibanValid("IT60X0542811101000000123456")).toBe(true);
    expect(ibanValid("IT61X0542811101000000123456")).toBe(false);
    const text = "IBAN: IT60 X054 2811 1010 0000 0123 456 BIC BPMOIT22. Also DE89370400440532013000 and GB82 WEST 1234 5698 7654 32.";
    expect(found(text, "iban")).toEqual(["IT60 X054 2811 1010 0000 0123 456", "DE89370400440532013000", "GB82 WEST 1234 5698 7654 32"]);
    // A mistyped Italian IBAN is still covered, up to the Italian length.
    expect(found("IT61 X054 2811 1010 0000 0123 456 BIC", "iban")).toEqual(["IT61 X054 2811 1010 0000 0123 456"]);
  });

  it("finds an IBAN that wraps onto the next line", () => {
    expect(found("IBAN: IT60 X054 2811 1010\n0000 0123 456\nBIC BPMOIT22", "iban")).toEqual(["IT60 X054 2811 1010\n0000 0123 456"]);
    // A line that only looks like the start of an IBAN does not swallow the real one below it.
    expect(found("Rif. AB12 CDEF GHIJ\nIT60 X054 2811 1010 0000 0123 456", "iban")).toEqual(["IT60 X054 2811 1010 0000 0123 456"]);
    // Typed in one piece, printed over two lines.
    expect(findQuery("IT60X05428111\n01000000123456", "IT60X0542811101000000123456")).toEqual([{ start: 0, end: 28 }]);
  });

  it("finds codici fiscali, omocodia included, but not inside longer words", () => {
    expect(found("CF: RSSMRA85T10A562S, rssmra85t10a562s, RSSMRA85T10A56NS; XRSSMRA85T10A562S", "cf")).toEqual([
      "RSSMRA85T10A562S",
      "rssmra85t10a562s",
      "RSSMRA85T10A56NS",
    ]);
  });
});

describe("matches to boxes", () => {
  // Two items on one line: "Mario " at x 40 and "Rossi" at x 100, size 10, on a 300 x 400 page.
  const items: TextPiece[] = [
    { str: "Mario ", transform: [10, 0, 0, 10, 40, 300], width: 60, height: 10 },
    { str: "Rossi", transform: [10, 0, 0, 10, 100, 300], width: 50, height: 10, hasEOL: true },
  ];
  const flip = [1, 0, 0, -1, 0, 400];

  it("gives one box per item a match touches, without the trailing space", () => {
    const page = joinText(items);
    expect(page.text).toBe("Mario Rossi\n");
    const [boxes] = rangeBoxes(items, page, findQuery(page.text, "mario rossi"), flip, 300, 400);
    expect(boxes).toHaveLength(2);
    // "Mario" is 2500 of the 2778 thousandths of an em in "Mario ": x 40 to 94, padded by 2 pt.
    expect(boxes![0]).toEqual({ x: 38, y: 90.5, w: 58, h: 12.5 });
    expect(boxes![1]).toEqual({ x: 98, y: 90.5, w: 54, h: 12.5 });
  });

  it("covers only the matched part of an item", () => {
    const one: TextPiece[] = [{ str: "IBAN IT60X0542811101000000123456", transform: [10, 0, 0, 10, 0, 300], width: 320, height: 10 }];
    const page = joinText(one);
    const [boxes] = rangeBoxes(one, page, findPattern(page.text, "iban"), flip, 300, 400);
    // "IBAN " is 2612 of 17512 thousandths of an em: the IBAN starts at 47.7 pt; the end is clipped to the page.
    expect(boxes).toEqual([{ x: 45.7, y: 90.5, w: 254.3, h: 12.5 }]);
  });

  it("draws one box per line when a match wraps", () => {
    const wrapped: TextPiece[] = [
      { str: "IBAN IT60 X054 2811 1010", transform: [10, 0, 0, 10, 40, 300], width: 150, height: 10, hasEOL: true },
      { str: "0000 0123 456 BIC", transform: [10, 0, 0, 10, 40, 285], width: 100, height: 10 },
    ];
    const page = joinText(wrapped);
    const [boxes] = rangeBoxes(wrapped, page, findPattern(page.text, "iban"), flip, 300, 400);
    expect(boxes).toHaveLength(2);
    // Line one from the IBAN's first letter to the end of the line, line two from its start; both padded by 2 pt.
    expect(boxes![0]!.x).toBeGreaterThan(40);
    expect(boxes![0]!.x + boxes![0]!.w).toBe(192);
    expect(boxes![1]!.x).toBe(38);
    expect(boxes![1]!.x + boxes![1]!.w).toBeLessThan(140);
    expect(boxes![1]!.y - boxes![0]!.y).toBe(15);
  });
});

describe("form fields and notes", () => {
  const flip = [1, 0, 0, -1, 0, 400];
  const rect = [40, 200, 240, 220];

  it("reads filled-in fields and text notes, and counts what search cannot read", () => {
    const { notes, unread } = readNotes([
      { subtype: "Widget", fieldType: "Tx", fieldValue: "RSSMRA85T10A562S", textContent: ["RSSMRA85T10A562S"], hasAppearance: true, rect },
      { subtype: "Widget", fieldType: "Tx", fieldValue: "not shown", hasAppearance: true, hidden: true, rect },
      { subtype: "Widget", fieldType: "Tx", fieldValue: "", hasAppearance: true, rect },
      {
        subtype: "Widget",
        fieldType: "Ch",
        combo: true,
        fieldValue: ["rm"],
        options: [
          { exportValue: "rm", displayValue: "Roma" },
          { exportValue: "mi", displayValue: "Milano" },
        ],
        hasAppearance: true,
        rect,
      },
      { subtype: "FreeText", textContent: ["Call Mario", "333 1234567"], contentsObj: { str: "Call Mario 333 1234567" }, rect },
      { subtype: "Widget", fieldType: "Sig", hasAppearance: true, rect },
      { subtype: "Stamp", hasAppearance: true, rect },
      { subtype: "Highlight", hasAppearance: true, rect },
      { subtype: "Link", rect },
    ]);
    expect(notes.map((n) => n.texts)).toEqual([["RSSMRA85T10A562S"], ["rm", "Roma"], ["Call Mario\n333 1234567", "Call Mario 333 1234567"]]);
    // The signature and the stamp may show words; the highlight and the link do not.
    expect(unread).toBe(2);
  });

  it("covers the whole field or note for a match inside it", () => {
    const { notes } = readNotes([
      { subtype: "Widget", fieldType: "Tx", fieldValue: "CF RSSMRA85T10A562S", hasAppearance: true, rect },
      { subtype: "FreeText", contentsObj: { str: "Mario Rossi, then Mario again" }, rect: [10, 10, 110, 60] },
    ]);
    expect(noteBoxes(notes, (text) => findPattern(text, "cf"), flip, 300, 400)).toEqual([[{ x: 40, y: 180, w: 200, h: 20 }]]);
    // Two matches in one note: the same box twice, so the count matches what was found.
    const note = { x: 10, y: 340, w: 100, h: 50 };
    expect(noteBoxes(notes, (text) => findQuery(text, "mario"), flip, 300, 400)).toEqual([[note], [note]]);
    expect(noteBoxes(notes, (text) => findQuery(text, "bianchi"), flip, 300, 400)).toEqual([]);
  });
});
