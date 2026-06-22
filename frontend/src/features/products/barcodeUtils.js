const CODE39_PATTERNS = {
  "0": "nnnwwnwnn",
  "1": "wnnwnnnnw",
  "2": "nnwwnnnnw",
  "3": "wnwwnnnnn",
  "4": "nnnwwnnnw",
  "5": "wnnwwnnnn",
  "6": "nnwwwnnnn",
  "7": "nnnwnnwnw",
  "8": "wnnwnnwnn",
  "9": "nnwwnnwnn",
  A: "wnnnnwnnw",
  B: "nnwnnwnnw",
  C: "wnwnnwnnn",
  D: "nnnnwwnnw",
  E: "wnnnwwnnn",
  F: "nnwnwwnnn",
  G: "nnnnnwwnw",
  H: "wnnnnwwnn",
  I: "nnwnnwwnn",
  J: "nnnnwwwnn",
  K: "wnnnnnnww",
  L: "nnwnnnnww",
  M: "wnwnnnnwn",
  N: "nnnnwnnww",
  O: "wnnnwnnwn",
  P: "nnwnwnnwn",
  Q: "nnnnnnwww",
  R: "wnnnnnwwn",
  S: "nnwnnnwwn",
  T: "nnnnwnwwn",
  U: "wwnnnnnnw",
  V: "nwwnnnnnw",
  W: "wwwnnnnnn",
  X: "nwnnwnnnw",
  Y: "wwnnwnnnn",
  Z: "nwwnwnnnn",
  "-": "nwnnnnwnw",
  ".": "wwnnnnwnn",
  " ": "nwwnnnwnn",
  "$": "nwnwnwnnn",
  "/": "nwnwnnnwn",
  "+": "nwnnnwnwn",
  "%": "nnnwnwnwn",
  "*": "nwnnwnwnn",
};

export function normalizeBarcodeValue(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/Đ/g, "D")
    .replace(/[^0-9A-Z\-.$/+% ]/g, "")
    .trim();
}

export function buildAutoBarcode(seed = "SP") {
  const cleanSeed = normalizeBarcodeValue(seed).replace(/\s+/g, "-") || "SP";
  const stamp = Date.now().toString().slice(-6);
  return normalizeBarcodeValue(`${cleanSeed}-${stamp}`);
}

export function buildVariantSku(productCode = "SP", index = 1) {
  const cleanCode = normalizeBarcodeValue(productCode).replace(/\s+/g, "-") || "SP";
  return normalizeBarcodeValue(`${cleanCode}-V${String(index).padStart(2, "0")}`);
}

function getBarcodeBars(value) {
  const cleanValue = normalizeBarcodeValue(value);
  const encoded = `*${cleanValue}*`;

  let x = 0;
  const bars = [];
  const narrow = 1.5;
  const wide = 4.2;
  const gap = 1.5;

  for (const char of encoded) {
    const pattern = CODE39_PATTERNS[char];
    if (!pattern) continue;

    for (let index = 0; index < pattern.length; index += 1) {
      const width = pattern[index] === "w" ? wide : narrow;
      const isBar = index % 2 === 0;

      if (isBar) {
        bars.push({ x, width });
      }

      x += width;
    }

    x += gap;
  }

  return {
    bars,
    width: Math.max(x, 1),
    value: cleanValue,
  };
}

export function BarcodeSvg({ value, height = 52, showText = true }) {
  const { bars, width, value: cleanValue } = getBarcodeBars(value);

  if (!cleanValue) {
    return null;
  }

  const textHeight = showText ? 16 : 0;
  const viewHeight = height + textHeight;

  return (
    <svg
      viewBox={`0 0 ${width} ${viewHeight}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Barcode ${cleanValue}`}
    >
      <rect x="0" y="0" width={width} height={viewHeight} fill="white" />
      {bars.map((bar, index) => (
        <rect
          key={`${bar.x}-${index}`}
          x={bar.x}
          y="0"
          width={bar.width}
          height={height}
          fill="black"
        />
      ))}
      {showText && (
        <text
          x={width / 2}
          y={height + 12}
          textAnchor="middle"
          fontSize="10"
          fontFamily="monospace"
          fill="black"
        >
          {cleanValue}
        </text>
      )}
    </svg>
  );
}
