export interface UserSession {
  infos: {
    firstName: string;
    lastName: string;
    address: string;
    country: string;
    phoneNumber: string;
    email: string;
  };
  cart: {
    items: Array<{
      id: number;
      quantity: number;
    }>;
  };
}
