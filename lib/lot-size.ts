export function calculateRiskAmount(accountSize: number, riskPercent: number) {
    return (accountSize * riskPercent) / 100;
  }
  
  type LotSizeInput = {
    accountSize: number;
    riskPercent: number;
    stopLossPips: number;
    pipValuePerStandardLot: number;
  };
  
  export function calculateLotSize({
    accountSize,
    riskPercent,
    stopLossPips,
    pipValuePerStandardLot,
  }: LotSizeInput) {
    if (
      accountSize <= 0 ||
      riskPercent <= 0 ||
      stopLossPips <= 0 ||
      pipValuePerStandardLot <= 0
    ) {
      return 0;
    }
  
    const riskAmount = calculateRiskAmount(accountSize, riskPercent);
    const lotSize = riskAmount / (stopLossPips * pipValuePerStandardLot);
  
    return Number(lotSize.toFixed(2));
  }