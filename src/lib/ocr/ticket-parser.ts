export type ParsedTicketFields = {
  matchCount: number | null;
  totalOdds: number | null;
  stakeAmount: number | null;
  potentialWinnings: number | null;
};

const normalizeOcrText = (text: string) =>
  text
    .normalize('NFKC')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .toUpperCase();

const parseOcrNumber = (value: string) => {
  const cleaned = value.replace(/[^\d.,]/g, '');

  if (!cleaned) return null;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  const decimalIndex = Math.max(lastComma, lastDot);

  let normalized = cleaned;

  if (decimalIndex >= 0) {
    const integerPart = cleaned.slice(0, decimalIndex).replace(/[^\d]/g, '');
    const decimalPart = cleaned.slice(decimalIndex + 1).replace(/[^\d]/g, '');
    normalized = decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
  }

  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
};

const findNumberAfterLabel = (text: string, labels: string[]) => {
  for (const label of labels) {
    const pattern = new RegExp(`${label}[^\\d]{0,40}(\\d[\\d.,]*)`, 'iu');
    const match = text.match(pattern);
    const value = match?.[1] ? parseOcrNumber(match[1]) : null;

    if (value !== null) return value;
  }

  return null;
};

const findIntegerAfterLabel = (text: string, labels: string[]) => {
  const value = findNumberAfterLabel(text, labels);
  return value === null ? null : Math.round(value);
};

export function parseTicketFields(rawText: string): ParsedTicketFields {
  const text = normalizeOcrText(rawText);

  return {
    matchCount: findIntegerAfterLabel(text, [
      'ΑΓΩΝΕΣ',
      'ΓΕΓΟΝΟΤΑ',
      'ΕΠΙΛΟΓΕΣ',
      'MATCHES',
      'EVENTS',
      'SELECTIONS',
    ]),
    totalOdds: findNumberAfterLabel(text, [
      'ΣΥΝΟΛΙΚΗ\\s*ΑΠΟΔΟΣΗ',
      'ΣΥΝ\\.?\\s*ΑΠΟΔ',
      'ΣΥΝΟΛΙΚΗ',
      'TOTAL\\s*ODDS',
      'ODDS',
      'ΑΠΟΔΟΣΗ',
    ]),
    stakeAmount: findNumberAfterLabel(text, [
      'ΠΟΝΤΑΡΙΣΜΑ',
      'ΠΟΣΟ\\s*ΣΤΟΙΧΗΜΑΤΟΣ',
      'ΠΟΣΟ',
      'ΣΤΟΙΧΗΜΑ',
      'STAKE',
      'WAGER',
    ]),
    potentialWinnings: findNumberAfterLabel(text, [
      'ΠΙΘΑΝΑ\\s*ΚΕΡΔΗ',
      'ΠΙΘΑΝΟ\\s*ΚΕΡΔΟΣ',
      'ΠΙΘΑΝΗ\\s*ΕΠΙΣΤΡΟΦΗ',
      'ΚΕΡΔΗ',
      'POTENTIAL\\s*WINNINGS',
      'PAYOUT',
      'RETURNS',
    ]),
  };
}
