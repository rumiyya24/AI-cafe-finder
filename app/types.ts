export type Cafe = {
  id: string;
  displayName: { text: string };
  formattedAddress: string;
  rating?: number;
  userRatingCount?: number;
  location?: { latitude: number; longitude: number };
  photos?: { name: string; authorAttributions?: { displayName: string }[] }[];
};

export type VibeInfo = {
  noise_level: string;
  noise_evidence: string;
  noise_review_index?: number;
  wifi: string;
  wifi_evidence: string;
  wifi_review_index?: number;
  outlets: string;
  outlets_evidence: string;
  outlets_review_index?: number;
  good_for_studying: string;
  studying_evidence: string;
  studying_review_index?: number;
  data_source?: string;
  review_urls?: string[];
};

export type NoteInfo = {
  noise_level?: string;
  wifi?: string;
  outlets?: string;
  good_for_studying?: string;
  personal_note?: string;
};