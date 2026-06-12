/**
 * English copy for questionnaire UI and AI payload dimensions (locale "en").
 * Scores and option IDs stay aligned with `src/lib/questionnaire-data.ts`.
 */
export type QuestionnaireEnOverlay = {
  category: string;
  text: string;
  description?: string;
  options: Record<string, string>;
};

export const QUESTIONNAIRE_EN_OVERLAY: Record<string, QuestionnaireEnOverlay> = {
  q1: {
    category: "Time horizon",
    text: "What is your investment horizon?",
    description:
      "How long you plan to keep your investments before you may need the money.",
    options: {
      q1a: "Less than 2 years",
      q1b: "Between 2 and 5 years",
      q1c: "Between 5 and 10 years",
      q1d: "More than 10 years",
    },
  },
  q2: {
    category: "Risk tolerance",
    text: "If your portfolio lost 20% in a month, what would you do?",
    description: "This measures your emotional reaction to losses.",
    options: {
      q2a: "Sell everything immediately to avoid further losses",
      q2b: "Sell part to reduce risk",
      q2c: "Hold and wait for recovery",
      q2d: "Buy more to take advantage of lower prices",
    },
  },
  q3: {
    category: "Financial goals",
    text: "What is your main goal when investing?",
    options: {
      q3a: "Preserve capital and protect against inflation",
      q3b: "Generate regular income (dividends, interest)",
      q3c: "Moderate growth with some income",
      q3d: "Maximize long-term growth",
    },
  },
  q4: {
    category: "Experience",
    text: "How much investing experience do you have?",
    options: {
      q4a: "None—I am completely new",
      q4b: "Basic—I have used funds or deposits",
      q4c: "Intermediate—I invest regularly in stocks and ETFs",
      q4d: "Advanced—I use derivatives and complex strategies",
    },
  },
  q5: {
    category: "Financial situation",
    text: "What share of your total savings do you plan to invest?",
    description: "This helps us understand your ability to absorb losses.",
    options: {
      q5a: "Less than 10%",
      q5b: "Between 10% and 30%",
      q5c: "Between 30% and 60%",
      q5d: "More than 60%",
    },
  },
  q6: {
    category: "Risk tolerance",
    text: "How do you feel about market volatility?",
    options: {
      q6a: "It makes me very anxious—I prefer full stability",
      q6b: "I tolerate it if it is temporary and not too sharp",
      q6c: "I accept it as a natural part of investing",
      q6d: "It motivates me—I see opportunities in volatility",
    },
  },
  q7: {
    category: "Preferences",
    text: "Which type of investment appeals to you most?",
    options: {
      q7a: "Government bonds or high-yield savings accounts",
      q7b: "A mix of corporate bonds and blue-chip stocks",
      q7c: "ETFs tracking the S&P 500 or global markets",
      q7d: "Growth stocks, startups, or cryptocurrencies",
    },
  },
  q8: {
    category: "Financial situation",
    text: "Do you have an emergency fund covering at least 6 months of expenses?",
    options: {
      q8a: "No—and building it is my priority first",
      q8b: "I have roughly 3 months covered",
      q8c: "Yes—between 6 and 12 months covered",
      q8d: "Yes—more than 12 months and other income sources",
    },
  },
  q9: {
    category: "Leverage",
    text: "What relationship do you want with leverage (margin, CFDs, futures, etc.)?",
    description:
      "Leverage magnifies gains and losses; it is not suitable for every profile.",
    options: {
      q9a: "I do not use it and do not plan to—cash or no margin only",
      q9b: "Only unleveraged products or very low, controlled leverage",
      q9c: "Some margin or leveraged products occasionally with clear limits",
      q9d: "Comfortable with margin, CFDs, futures, or options as part of my strategy",
    },
  },
  q10: {
    category: "Crypto and digital assets",
    text: "How do cryptocurrencies or other digital assets fit your strategy?",
    options: {
      q10a: "I do not invest and they do not interest me for my core portfolio",
      q10b: "Only very small exposure or regulated wrappers (ETNs, etc.)",
      q10c: "Meaningful but bounded part of the portfolio",
      q10d: "They are a major pillar—I accept very high volatility",
    },
  },
  q11: {
    category: "International markets",
    text: "How far do you want to go beyond your home market or reference currency?",
    options: {
      q11a: "Almost everything in domestic market and local currency",
      q11b: "Mainly US and developed Europe",
      q11c: "I deliberately include emerging markets, Asia, or other regions",
      q11d: "I actively seek global diversification, currencies, and niches",
    },
  },
  q12: {
    category: "IPOs and new listings",
    text: "How do you view participating in IPOs, SPACs, or newly listed companies?",
    options: {
      q12a: "I avoid them—I prefer proven track records and liquidity",
      q12b: "Only very well researched cases with small portfolio weight",
      q12c: "I am interested when they fit my thesis and risk is acceptable",
      q12d: "I like following IPOs and new listings",
    },
  },
  q13: {
    category: "Derivatives and complex products",
    text: "Beyond stocks and simple funds, do you use or want options, warrants, or structured products?",
    options: {
      q13a: "No—only stocks, funds, or ETFs without added complexity",
      q13b: "Simple hedges or products with very clear documentation, rarely",
      q13c: "Options or structured strategies when they fit my plan",
      q13d: "I use them often for return, hedging, or arbitrage",
    },
  },
  q14: {
    category: "Income and dependence",
    text: "How much do you rely on investment returns to cover essential spending?",
    description:
      "Higher dependence on returns often calls for lower risk on the essential slice.",
    options: {
      q14a: "Most of my essential budget depends on investment returns",
      q14b: "A large share of everyday spending depends on returns",
      q14c: "Covers extras; essentials come from work, pensions, or other income",
      q14d:
        "Does not cover essentials—I invest long-term with stable other income",
    },
  },
  q15: {
    category: "Management style",
    text: "How would you describe your style for monitoring and trading?",
    options: {
      q15a: "Buy and hold for years except rare reviews",
      q15b: "Quarterly or annual reviews, infrequent changes",
      q15c: "Monthly monitoring and adjustments when needed",
      q15d: "Active—I review often and trade with some frequency",
    },
  },
  q16: {
    category: "Inflation and rates",
    text: "With rising rates or persistent inflation, which stance fits you best?",
    options: {
      q16a: "It worries me—I prioritize capital preservation and quality debt",
      q16b: "I seek balance between protection and growth",
      q16c: "I tilt toward assets that historically benefit in inflationary regimes",
      q16d: "I bake it into my thesis and look for opportunities (sectors, value, etc.)",
    },
  },
  q17: {
    category: "Net worth",
    text: "What is the approximate order of magnitude of your investable financial wealth (excluding your primary home)?",
    description:
      "Rough ranges; no exact figure needed. Helps align the profile with your loss capacity.",
    options: {
      q17a: "Less than €10,000",
      q17b: "Between €10,000 and €50,000",
      q17c: "Between €50,000 and €250,000",
      q17d: "More than €250,000",
    },
  },
  q18: {
    category: "Income",
    text: "What is the approximate order of magnitude of your household’s annual net income (what you earn or declare per year)?",
    description: "Approximate. Reflects stability and slack for surprises.",
    options: {
      q18a: "Less than €18,000 per year",
      q18b: "Between €18,000 and €45,000 per year",
      q18c: "Between €45,000 and €90,000 per year",
      q18d: "More than €90,000 per year",
    },
  },
  q19: {
    category: "Debt and obligations",
    text: "Excluding a mortgage or loans tied to your primary home, how would you describe your debt situation?",
    options: {
      q19a: "Debts that create stress or default risk",
      q19b: "Payments that heavily reduce my monthly saving capacity",
      q19c: "Controlled debts (cards, loans) with manageable payments",
      q19d: "Little or no debt—or only comfortable financing (car, etc.)",
    },
  },
  q20: {
    category: "Saving",
    text: "What is your typical saving capacity relative to your net income?",
    description:
      "The share you can usually allocate to investing or reserves, not routine spending.",
    options: {
      q20a: "Almost nothing—some months are very tight",
      q20b: "Less than 5% of my net income",
      q20c: "Between 5% and 15%",
      q20d: "More than 15% or very stable month-to-month saving",
    },
  },
};
