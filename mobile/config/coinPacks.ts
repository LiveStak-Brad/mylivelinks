export type MobileIapCoinPack = {
  id: string;
  productId: string;
  usdCents: number;
  coins: number;
  title: string;
};

export const MOBILE_IAP_COIN_PACKS: MobileIapCoinPack[] = [
  { id: 'coins_250', productId: 'com.mylivelinks.app.coins_250', usdCents: 500, coins: 250, title: '250 Coins' },
  { id: 'coins_500', productId: 'com.mylivelinks.app.coins_500', usdCents: 1000, coins: 500, title: '500 Coins' },
  { id: 'coins_1250', productId: 'com.mylivelinks.app.coins_1250', usdCents: 2500, coins: 1250, title: '1,250 Coins' },
  { id: 'coins_2500', productId: 'com.mylivelinks.app.coins_2500', usdCents: 5000, coins: 2500, title: '2,500 Coins' },
  { id: 'coins_5000', productId: 'com.mylivelinks.app.coins_5000', usdCents: 10000, coins: 5000, title: '5,000 Coins' },
  { id: 'coins_12500', productId: 'com.mylivelinks.app.coins_12500', usdCents: 25000, coins: 12500, title: '12,500 Coins' },
  { id: 'coins_25000', productId: 'com.mylivelinks.app.coins_25000', usdCents: 50000, coins: 25000, title: '25,000 Coins' },
  { id: 'coins_50000', productId: 'com.mylivelinks.app.coins_50000', usdCents: 100000, coins: 50000, title: '50,000 Coins' },
];

export function getMobileIapCoinPackByProductId(productId: string): MobileIapCoinPack | null {
  const match = MOBILE_IAP_COIN_PACKS.find((p) => p.productId === productId);
  return match ?? null;
}
