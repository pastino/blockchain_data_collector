import { AxiosError } from "axios";

export const isAxiosError = (candidate: unknown): candidate is AxiosError => {
  if (
    candidate &&
    typeof candidate === "object" &&
    "isAxiosError" in candidate
  ) {
    return true;
  }
  return false;
};

export const sleep = (sec: number) => {
  return new Promise((resolve) => setTimeout(resolve, sec * 1000));
};

export const subtractHours = (date: Date, hours: number) => {
  date.setHours(date.getHours() - hours);
  return date;
};

export const addHours = (date: Date, hours: number) => {
  date.setHours(date.getHours() + hours);
  return date;
};

export const getOpenseaApiKey = () => {
  if (
    process.env.PORT === (4000 as any) ||
    ((process.env.PORT as any) >= 5001 && (process.env.PORT as any) <= 5007)
  ) {
    return process.env.OPENSEA_API_KEY;
  } else if (
    (process.env.PORT as any) >= 5008 &&
    (process.env.PORT as any) <= 5015
  ) {
    return process.env.OPENSEA_API_KEY_2;
  }
  return process.env.OPENSEA_API_KEY;
};

export const hexToDecimal = (hexValue: string) => {
  return parseInt(hexValue, 16);
};
