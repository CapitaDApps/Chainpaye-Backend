export interface CrossmintBalance {
  symbol: string;
  name: string;
  decimals: number;
  amount: string;
  rawAmount: string;
  chains: Record<
    string,
    {
      locator: string;
      amount: string;
      rawAmount: string;
      mintHash?: string;
    }
  >;
}
