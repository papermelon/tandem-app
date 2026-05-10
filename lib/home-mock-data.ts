import type { CareRecipient, CaregiverProfile } from "@/lib/types";

export const mockCaregiver: CaregiverProfile = {
  id: "caregiver-default",
  name: "",
  circleId: "circle-tan",
  language: "en",
};

export const mockPatients: CareRecipient[] = [
  {
    id: "recipient-ah-muay",
    name: "Ah Muay",
    age: 78,
    context: "Mild dementia, recent fall, rehab follow-up",
    address: "Toa Payoh, Singapore",
    careCircleId: "circle-tan",
    relationship: "Mother",
    country: "Singapore",
    phone: "+65 8123 4567",
    careProfile: {
      summary: "Quick reference for meals, mobility, and daily safety checks.",
      updatedAt: "today",
      sections: [
        {
          label: "Food texture",
          value: "Soft foods preferred",
          notes: ["Avoid hard or crunchy food unless someone is supervising.", "Cut meat and fruit into small pieces."]
        },
        {
          label: "Drinks",
          value: "Warm water or milo",
          notes: ["Encourage small sips during meals."]
        },
        {
          label: "Mobility",
          value: "Use walking stick outside",
          notes: ["Hold her arm on stairs or wet floors."]
        },
        {
          label: "Watch for",
          value: "Dizziness, missed meals, new confusion",
          notes: ["Add a note if symptoms appear after medication."]
        }
      ]
    }
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
