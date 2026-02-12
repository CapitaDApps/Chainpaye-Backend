import axios from "axios";
import { CrossmintBalance } from "../types/crossmint";

export class CrossmintService {
    
  private baseUrl = "https://crossmint.com/api/2025-06-09";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey ="kll?";
     ;
    console.log("CrossmintService initiaalized with API Key:", this.apiKey);
  }

  async getWalletBalancesInternal(
    userId: string,
    chain: string,
    tokens: string[] = ["usdc", "usdt"],
  ): Promise<CrossmintBalance[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/wallets/userId:kehsiroMhY7DH7NFPmbo_:evm:smart/balances`,
        {
          headers: {
            "x-api-key": "sk_production_5ubykeThUAkbZkRGmqchGZRaa2cVXhmi2XU2sPQyc3jaR8bHZSyvFVC7RzF14nNgvo66WyesSXHTUjYTZC32Hm2HGEkyegGy8yUU7xX5Z6CepuBPymTa3bSkdvzYT2JZp8WBvzomoPwmxwUEEgUHFjJEBc34cZbuiLnHGFnhL19gLhv1T8jhK2Mc7HYW4CiJY3hYYmvu44N5iyuA8jDvncpA"
,
          },
          params: {
            tokens: tokens.join(","),
          },
        },
      );
      const d =JSON.stringify(response.data, null, 2)

       console.log(
        `✅ Retrieved balances for user ${userId} on ${chain}`,
        
      );

      return response.data;
    } catch (error: any) {
      console.error(
        `Error getting ${chain} balances for user ${userId}:`,
        error.response?.data || error.message,
      );

      throw new Error(
        `Failed to get ${chain} balances: ${
          error.response?.data?.message || error.message
        }`,
      );
    }
  }
}
