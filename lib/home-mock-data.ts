import type { CareRecipient, CaregiverProfile } from "@/lib/types";

export const mockCaregiver: CaregiverProfile = {
  id: "caregiver-default",
  name: "",
  circleId: "circle-tan",
  language: "en",
};

export const mockPatients: CareRecipient[] = [
  {
    id: "recipient-ahma",
    name: "Ahma",
    age: 70,
    context: "Mild cognitive impairment, post-stroke rehab",
    address: "Toa Payoh, Singapore",
    careCircleId: "circle-tan",
    relationship: "Mother",
    country: "Singapore",
  },
  {
    id: "recipient-grandma",
    name: "Grandma",
    age: 78,
    context: "Hypertension, lives alone with weekly helper",
    address: "Bedok, Singapore",
    careCircleId: "circle-tan",
    relationship: "Grandmother",
    country: "Singapore",
  },
];
