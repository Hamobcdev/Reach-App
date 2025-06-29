export interface CardDetails {
  id: string;
  cardNumber: string;
  cvv: string;
  expiryDate: string;
  holderName: string;
  phoneNumber: string;
  amount: number;
  status: "valid" | "expired" | "used";
  createdAt: Date;
}

export interface CardFormData {
  fullName: string;
  phoneNumber: string;
  amount: number;
}
