export type LanguageCode =
  | "en"
  | "zh"
  | "ms"
  | "ta"
  | "id"
  | "th"
  | "vi"
  | "tl"
  | "my"
  | "km"
  | "lo";

export type LanguageOption = {
  code: LanguageCode;
  label: string;
  native: string;
};

export const SEA_LION_LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English", native: "English" },
  { code: "zh", label: "Chinese", native: "中文" },
  { code: "ms", label: "Malay", native: "Bahasa Melayu" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "id", label: "Indonesian", native: "Bahasa Indonesia" },
  { code: "th", label: "Thai", native: "ไทย" },
  { code: "vi", label: "Vietnamese", native: "Tiếng Việt" },
  { code: "tl", label: "Filipino", native: "Filipino" },
  { code: "my", label: "Burmese", native: "မြန်မာ" },
  { code: "km", label: "Khmer", native: "ខ្មែរ" },
  { code: "lo", label: "Lao", native: "ລາວ" },
];
