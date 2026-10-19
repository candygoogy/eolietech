#!/usr/bin/env sh
# Regenerates the CMS / .p7m fixtures used by src/tools/signed-shared/p7m.test.ts, plus two copies for
# the tool e2e tests (e2e/fixtures/document/). Needs OpenSSL 3. Run from anywhere:
#   sh src/tools/signed-shared/fixtures/make.sh
# A throwaway CA and two signers (RSA 2048, ECDSA P-256) with Italian-looking subjects; the keys live
# in a temp dir and are deleted on exit. Nothing here is a real certificate. Outputs change on every
# run (fresh keys, signing time), the tests only rely on what is stable.
set -eu
export MSYS_NO_PATHCONV=1 # Git Bash on Windows would rewrite "/C=IT/..." into a path

here=$(cd "$(dirname "$0")" && pwd)
root=$(cd "$here/../../../.." && pwd)
e2e="$root/e2e/fixtures/document"
cd "$here"
tmp=.tmp-keys # relative: a native (Windows) openssl cannot open /tmp paths
rm -rf "$tmp" && mkdir "$tmp"
trap 'rm -rf "$tmp"' EXIT
cd "$here"

cat > "$tmp/ext.cnf" <<'CNF'
keyUsage = critical, nonRepudiation
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid
CNF

# CA and signers.
openssl req -quiet -x509 -newkey rsa:2048 -nodes -sha256 -days 3650 -keyout "$tmp/ca.key" -out "$tmp/ca.crt" \
  -subj "/C=IT/O=Example Trust Services S.p.A./CN=Example Trust CA 3"
openssl req -quiet -new -newkey rsa:2048 -nodes -keyout "$tmp/rsa.key" -out "$tmp/rsa.csr" \
  -subj "/C=IT/O=Example CA/CN=Mario Rossi/SN=Rossi/GN=Mario/serialNumber=TINIT-RSSMRA80A01H501U"
openssl x509 -req -in "$tmp/rsa.csr" -CA "$tmp/ca.crt" -CAkey "$tmp/ca.key" -set_serial 0x1001 -days 3650 \
  -sha256 -extfile "$tmp/ext.cnf" -out "$tmp/rsa.crt" 2>/dev/null
openssl req -quiet -new -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes -keyout "$tmp/ec.key" -out "$tmp/ec.csr" \
  -subj "/C=IT/O=Example CA/CN=Giulia Bianchi/SN=Bianchi/GN=Giulia/serialNumber=TINIT-BNCGLI85M41F205X"
openssl x509 -req -in "$tmp/ec.csr" -CA "$tmp/ca.crt" -CAkey "$tmp/ca.key" -set_serial 0x1002 -days 3650 \
  -sha256 -extfile "$tmp/ext.cnf" -out "$tmp/ec.crt" 2>/dev/null

# Payloads: a tiny FatturaPA-like invoice and a two-page PDF.
cp "$root/e2e/fixtures/pdf/two-pages.pdf" sample.pdf
cat > fattura.xml <<'XML'
<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica versione="FPR12" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente><IdPaese>IT</IdPaese><IdCodice>01234567890</IdCodice></IdTrasmittente>
      <ProgressivoInvio>00001</ProgressivoInvio>
      <FormatoTrasmissione>FPR12</FormatoTrasmissione>
      <CodiceDestinatario>0000000</CodiceDestinatario>
    </DatiTrasmissione>
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>01234567890</IdCodice></IdFiscaleIVA>
        <Anagrafica><Denominazione>Esempio Società S.r.l.</Denominazione></Anagrafica>
        <RegimeFiscale>RF01</RegimeFiscale>
      </DatiAnagrafici>
      <Sede><Indirizzo>Via Roma 1</Indirizzo><CAP>98055</CAP><Comune>Lipari</Comune><Provincia>ME</Provincia><Nazione>IT</Nazione></Sede>
    </CedentePrestatore>
    <CessionarioCommittente>
      <DatiAnagrafici>
        <CodiceFiscale>RSSMRA80A01H501U</CodiceFiscale>
        <Anagrafica><Nome>Mario</Nome><Cognome>Rossi</Cognome></Anagrafica>
      </DatiAnagrafici>
      <Sede><Indirizzo>Via Garibaldi 2</Indirizzo><CAP>00100</CAP><Comune>Roma</Comune><Provincia>RM</Provincia><Nazione>IT</Nazione></Sede>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>TD01</TipoDocumento><Divisa>EUR</Divisa><Data>2026-10-01</Data><Numero>42/2026</Numero>
        <ImportoTotaleDocumento>122.00</ImportoTotaleDocumento>
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>
      <DettaglioLinee>
        <NumeroLinea>1</NumeroLinea><Descrizione>Consulenza tecnica (perché sì)</Descrizione>
        <Quantita>1.00</Quantita><PrezzoUnitario>100.00</PrezzoUnitario><PrezzoTotale>100.00</PrezzoTotale><AliquotaIVA>22.00</AliquotaIVA>
      </DettaglioLinee>
      <DatiRiepilogo>
        <AliquotaIVA>22.00</AliquotaIVA><ImponibileImporto>100.00</ImponibileImporto><Imposta>22.00</Imposta><EsigibilitaIVA>I</EsigibilitaIVA>
      </DatiRiepilogo>
    </DatiBeniServizi>
    <DatiPagamento>
      <CondizioniPagamento>TP02</CondizioniPagamento>
      <DettaglioPagamento><ModalitaPagamento>MP05</ModalitaPagamento><ImportoPagamento>122.00</ImportoPagamento></DettaglioPagamento>
    </DatiPagamento>
  </FatturaElettronicaBody>
</p:FatturaElettronica>
XML

rsa="-signer $tmp/rsa.crt -inkey $tmp/rsa.key"
ec="-signer $tmp/ec.crt -inkey $tmp/ec.key"
sign() { openssl cms -sign -binary -md sha256 "$@"; }

# RSA PKCS#1 v1.5 + SHA-256, DER, CA certificate in the bag too (signer is picked by issuer + serial).
sign -nodetach -outform DER $rsa -certfile "$tmp/ca.crt" -in fattura.xml -out rsa-sha256.xml.p7m
# Same envelope as base64 with "-----BEGIN CMS-----" armour and line breaks.
openssl cms -cmsout -inform DER -in rsa-sha256.xml.p7m -outform PEM -out rsa-sha256.xml.p7m.pem
tr -d '\r' < rsa-sha256.xml.p7m.pem > "$tmp/pem" && mv "$tmp/pem" rsa-sha256.xml.p7m.pem # a Windows openssl writes CRLF
# Streamed BER: indefinite lengths, eContent as a constructed OCTET STRING.
sign -nodetach -stream -outform DER $rsa -in sample.pdf -out rsa-stream.pdf.p7m
# ECDSA P-256, signer identified by subjectKeyIdentifier.
sign -nodetach -outform DER $ec -keyid -in sample.pdf -out ecdsa-p256.pdf.p7m
# RSA-PSS (parameters in signatureAlgorithm).
sign -nodetach -outform DER $rsa -keyopt rsa_padding_mode:pss -in fattura.xml -out rsa-pss.xml.p7m
# No signed attributes: the signature covers the content itself.
sign -nodetach -outform DER $rsa -noattr -in fattura.xml -out rsa-noattr.xml.p7m
# Countersigned file as Italian apps make it: a .p7m of a .p7m (outer RSA, inner ECDSA).
sign -nodetach -outform DER $rsa -in ecdsa-p256.pdf.p7m -out double.pdf.p7m.p7m
# No certificates in the file: the signer can be described only by its issuer + serial.
sign -nodetach -outform DER $rsa -nocerts -in fattura.xml -out rsa-nocerts.xml.p7m
# Detached signature (no eContent).
sign -outform DER $rsa -in fattura.xml -out detached.xml.p7m
# Tampered: one byte of the invoice number changed inside the signed content ("42/2026" -> "43/2026").
cp rsa-sha256.xml.p7m tampered.xml.p7m
off=$(grep -obUa "42/2026" tampered.xml.p7m | head -n 1 | cut -d: -f1)
printf '3' | dd of=tampered.xml.p7m bs=1 seek=$((off + 1)) conv=notrunc 2>/dev/null

# Copies for the tool e2e tests.
mkdir -p "$e2e"
cp rsa-sha256.xml.p7m "$e2e/IT01234567890_00001.xml.p7m"
cp rsa-stream.pdf.p7m "$e2e/sample.pdf.p7m"

ls -l "$here" "$e2e"
