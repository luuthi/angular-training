export type Account = {
  _id: string;
  account_number: string;
  balance: number;
  age: number;
  firstname: string;
  lastname: string;
  gender: string;
  address: string;
  employer: string;
  email: string;
  city: string;
  state: string;
};

export function createAccount(data: Partial<Account>): Account {
  return {
    ...data,
  } as Account;
}


export type ParamSearch = {
  limit: number;
  start: number;
  last_name: string;
  first_name: string;
  email: string;
  gender: string;
  address: string;
};

export function createParamSearch(param: Partial<ParamSearch>): ParamSearch {
  return {
    ...param
  } as ParamSearch;
}
