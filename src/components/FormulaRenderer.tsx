import React from "react";

// Standard Replacements for LaTeX symbol macros to Unicode representations
const SYMBOL_MAP: Record<string, string> = {
  "\\\\pm": "±",
  "\\\\times": "×",
  "\\\\div": "÷",
  "\\\\rightarrow": "→",
  "\\\\Delta": "Δ",
  "\\\\delta": "δ",
  "\\\\pi": "π",
  "\\\\alpha": "α",
  "\\\\beta": "β",
  "\\\\gamma": "γ",
  "\\\\theta": "θ",
  "\\\\omega": "ω",
  "\\\\lambda": "λ",
  "\\\\mu": "μ",
  "\\\\phi": "φ",
  "\\\\sigma": "σ",
  "\\\\rho": "ρ",
  "\\\\tau": "τ",
  "\\\\le": "≤",
  "\\\\leq": "≤",
  "\\\\ge": "≥",
  "\\\\geq": "≥",
  "\\\\neq": "≠",
  "\\\\approx": "≈",
  "\\\\infty": "∞",
  "\\\\cdot": "·",
  "->": "→",
  "-->": "→"
};

/**
 * Preprocesses a mathematical/chemical formula string to clean up symbols.
 */
export function preprocessText(text: string): string {
  if (!text) return "";
  let processed = text;

  // 1. Shield URLs first to prevent replacing / or other symbols in links
  const shieldUrls: string[] = [];
  processed = processed.replace(/(https?:\/\/[^\s]+)/g, (match) => {
    shieldUrls.push(match);
    return `__SELECTION_URL_SHIELD_${shieldUrls.length - 1}__`;
  });

  // 2. Shield Dates like 30/12/2026 or 01/02/03 to prevent replacing / with ÷
  const shieldDates: string[] = [];
  processed = processed.replace(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/g, (match) => {
    shieldDates.push(match);
    return `__SELECTION_DATE_SHIELD_${shieldDates.length - 1}__`;
  });

  // 2.5. Shield Units of Measurement like m/s, km/h, g/mol, kg/m3 etc. to preserve the / symbol
  const shieldUnits: string[] = [];
  processed = processed.replace(/[a-zA-Z]+\/(s|s\^?[1-3]|s\^?\{[1-3]\}|h|min|mol|[Mm]|[Mm]\^?[1-3]|[Mm]\^?\{[1-3]\}|cm|cm\^?[1-3]|cm\^?\{[1-3]\}|dm|dm\^?[1-3]|dm\^?\{[1-3]\}|[Ll]|g|kg|mol)\b/g, (match) => {
    shieldUnits.push(match);
    return `__SELECTION_UNIT_SHIELD_${shieldUnits.length - 1}__`;
  });

  // 3. Replace symbolic representations in the map
  Object.entries(SYMBOL_MAP).forEach(([pattern, replacement]) => {
    const regex = new RegExp(pattern, "g");
    processed = processed.replace(regex, replacement);
  });

  // 4. Handle multiplication / times
  // Convert times latex macro or star (*) to nice " × "
  processed = processed.replace(/\s*\\times\s*/g, " × ");
  processed = processed.replace(/\s*\*\s*/g, " × ");
  
  // Also handle plain-text " x " or " X " written as multiplication between digits
  // E.g. "3 x 10" or "3x10" or "3 X 10"
  processed = processed.replace(/(\d+)\s*[xX]\s*(10\^|10\{|10\b)/g, "$1 × $2");
  processed = processed.replace(/(\d+)\s*[xX]\s*(\d+)/g, "$1 × $2");

  // 5. Handle division slash (/) -> convert to " ÷ "
  // Avoid replacing html tag closing slashes, URLs, or dates (thanks to shielding)
  processed = processed.replace(/\s*(?<!<)\/(?![a-zA-Z0-9]*>)\s*/g, " ÷ ");

  // 6. Support standard and LaTeX subscripts & superscripts
  // Convert ^{...} -> <sup>...</sup>
  processed = processed.replace(/\^\{([^}]*)\}/g, "<sup>$1</sup>");
  // Convert _{...} -> <sub>...</sub>
  processed = processed.replace(/_\{([^}]*)\}/g, "<sub>$1</sub>");

  // Convert simple ^value -> <sup>value</sup>
  // Matches exponents like 10^-5, x^2, e^x
  processed = processed.replace(/\^([0-9a-zA-Z+\-≈=#*]+)/g, "<sup>$1</sup>");
  // Convert simple _value -> <sub>value</sub>
  // Matches variables like x_i, U_e, I_1
  processed = processed.replace(/_([0-9a-zA-Z\x7f-\xff]+)/g, "<sub>$1</sub>");

  // 7. Auto-subscript chemical formulas
  // Matches only 1-2 character elements (Uppercase + optional lowercase) followed strictly by numbers,
  // preventing false matches on long words (e.g. Option1).
  processed = processed.replace(/([A-Z][a-z]?)(\d+)/g, "$1<sub>$2</sub>");

  // 8. Restore Shielded URLs
  shieldUrls.forEach((val, idx) => {
    processed = processed.replace(`__SELECTION_URL_SHIELD_${idx}__`, val);
  });

  // 9. Restore Shielded Dates
  shieldDates.forEach((val, idx) => {
    processed = processed.replace(`__SELECTION_DATE_SHIELD_${idx}__`, val);
  });

  // 9.5. Restore Shielded Units of Measurement
  shieldUnits.forEach((val, idx) => {
    processed = processed.replace(`__SELECTION_UNIT_SHIELD_${idx}__`, val);
  });

  return processed;
}

/**
 * Parse a standard math/science text into a hierarchy of React elements.
 * Handles subscripts, superscripts, root symbols, and fractions.
 */
export function parseFormulaToJSX(text: string): React.ReactNode {
  if (!text) return "";

  // Render sub and sup tags efficiently, handling optional braces
  // Preprocess symbols and chemistry
  let htmlText = preprocessText(text);

  // 1. Handle fractions: \frac{num}{den}
  // Standard LaTeX fractions can be nested, but we support single or double level nicely
  // We'll replace \frac{A}{B} with custom HTML templates containing attributes and parse them
  const fracRegex = /\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g;
  while (htmlText.match(fracRegex)) {
    htmlText = htmlText.replace(fracRegex, (match, num, den) => {
      return `<span class="math-fraction"><span class="math-numerator">${num}</span><span class="math-denominator">${den}</span></span>`;
    });
  }

  // 2. Handle square roots: \sqrt{A}
  const sqrtRegex = /\\sqrt\s*\{([^{}]+)\}/g;
  while (htmlText.match(sqrtRegex)) {
    htmlText = htmlText.replace(sqrtRegex, (match, inner) => {
      return `<span class="math-sqrt"><span class="math-sqrt-radical">√</span><span class="math-sqrt-inner">${inner}</span></span>`;
    });
  }

  // 3. Handle curly braces subscripts & superscripts ^{A} / _{A}
  htmlText = htmlText.replace(/\^\{([^}]+)\}/g, "<sup>$1</sup>");
  htmlText = htmlText.replace(/_\{([^}]+)\}/g, "<sub>$1</sub>");

  // 4. Handle simple subscripts & superscripts like x^2, x_i (excluding existing sub/sup tags or HTML tags)
  // Match single letters or digits following ^ or _
  // Avoid replacing if it is already part of an HTML tag or attributes
  htmlText = htmlText.replace(/\^([0-9a-zA-Z+\-≈=#*]+)(?![^<]*>)/g, "<sup>$1</sup>");
  htmlText = htmlText.replace(/_([0-9a-zA-Z\-]+)(?![^<]*>)/g, "<sub>$1</sub>");

  // Create standard inline markup dynamically with React's dangerouslySetInnerHTML is easiest and most robust
  // for mixed regex outputs. Let's wrap inside standard styles.
  return (
    <span 
      className="inline-math-container select-text"
      dangerouslySetInnerHTML={{ __html: htmlText }}
    />
  );
}

/**
 * Renders mathematical formulas in clean, raw, inline-styled Word-compatible HTML.
 * Used when generating Microsoft Word .doc documents.
 * MS Word supports simple tables for fractions, <sub> and <sup> for chemical indexes and powers, and basic styling.
 */
export function renderFormulaToHtml(text: string): string {
  if (!text) return "";

  let htmlText = preprocessText(text);

  // 1. Convert Word fractions which render perfectly as tiny tables with display:inline-table
  const fracRegex = /\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g;
  while (htmlText.match(fracRegex)) {
    htmlText = htmlText.replace(fracRegex, (match, num, den) => {
      // Clean up the numerator/denominator using recursion if needed
      const cleanNum = renderFormulaToHtml(num);
      const cleanDen = renderFormulaToHtml(den);
      return `<table class="word-fraction-table" style="display: inline-table; border-collapse: collapse; vertical-align: middle; text-align: center; margin: 0 3px; font-size: 85%;"><tr><td style="border-bottom: 1px solid #000000; padding: 0 3px; font-weight: bold;">${cleanNum}</td></tr><tr><td style="padding: 0 3px; font-weight: bold;">${cleanDen}</td></tr></table>`;
    });
  }

  // 2. Convert Square root to Word compatible look
  const sqrtRegex = /\\sqrt\s*\{([^{}]+)\}/g;
  while (htmlText.match(sqrtRegex)) {
    htmlText = htmlText.replace(sqrtRegex, (match, inner) => {
      const cleanInner = renderFormulaToHtml(inner);
      return `<span style="font-family: 'Arial', sans-serif;">√</span><span style="border-top: 1px solid #000000; padding-top: 1px; display: inline-block;">${cleanInner}</span>`;
    });
  }

  // 3. Curly brackets subscripts & superscripts
  htmlText = htmlText.replace(/\^\{([^}]+)\}/g, "<sup>$1</sup>");
  htmlText = htmlText.replace(/_\{([^}]+)\}/g, "<sub>$1</sub>");

  // 4. Simple power indices
  htmlText = htmlText.replace(/\^([0-9a-zA-Z+\-≈=#*]+)(?![^<]*>)/g, "<sup>$1</sup>");
  htmlText = htmlText.replace(/_([0-9a-zA-Z\-]+)(?![^<]*>)/g, "<sub>$1</sub>");

  return htmlText;
}

/**
 * React Component for Rendering mathematical & chemistry equations beautifully.
 */
interface FormulaRendererProps {
  text: string;
}

export const FormulaRenderer: React.FC<FormulaRendererProps> = ({ text }) => {
  return <>{parseFormulaToJSX(text)}</>;
};

export default FormulaRenderer;
