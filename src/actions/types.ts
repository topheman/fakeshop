export interface UserInfos {
  firstName: string;
  lastName: string;
  address: string;
  country: string;
  phoneNumber: string;
  email: string;
}
export interface Cart {
  items: Array<{
    id: number;
    quantity: number;
  }>;
}
