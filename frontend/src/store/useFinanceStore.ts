import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProjectCostBreakdown, EMIResult, RepaymentSchedule, OperatingCostItem, WorkingCapitalInputs, RevenueProjection } from '../types/finance';
import type { SchemeConfig, SelectedScheme } from '../types/scheme';
import { calculateProjectCost, calculateEMI, generateRepaymentSchedule } from '../utils/financial';
import { selectScheme } from '../config/schemeConfig';

interface FinanceState {
  marginCapital: number;
  projectCost: ProjectCostBreakdown | null;
  selectedScheme: SelectedScheme | null;
  emiResult: EMIResult | null;
  repaymentSchedule: RepaymentSchedule | null;
  operatingCosts: OperatingCostItem[];
  workingCapitalInputs: WorkingCapitalInputs;
  revenueProjection: RevenueProjection;

  setMarginCapital: (capital: number) => void;
  recalculateAll: (capital: number) => void;
  setOperatingCosts: (costs: OperatingCostItem[]) => void;
  setWorkingCapitalInputs: (inputs: WorkingCapitalInputs) => void;
  setRevenueProjection: (projection: RevenueProjection) => void;
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set) => ({
      marginCapital: 100000,
      projectCost: null,
      selectedScheme: null,
      emiResult: null,
      repaymentSchedule: null,
      operatingCosts: [
        { id: 'raw-materials', category: 'raw-materials', label: 'Raw Materials', amount: 15000 },
        { id: 'labour', category: 'labour', label: 'Labour', amount: 8000 },
        { id: 'rent', category: 'rent', label: 'Rent', amount: 3000 },
        { id: 'electricity', category: 'electricity', label: 'Electricity', amount: 2000 },
        { id: 'transport', category: 'transport', label: 'Transport', amount: 3000 },
        { id: 'maintenance', category: 'maintenance', label: 'Maintenance', amount: 1500 },
        { id: 'marketing', category: 'marketing', label: 'Marketing', amount: 2000 },
        { id: 'other', category: 'other', label: 'Other', amount: 1500 },
      ],
      workingCapitalInputs: {
        inventory: 20000,
        rawMaterial: 15000,
        labour: 8000,
        transport: 3000,
        utilities: 2000,
        emergencyReserve: 10000,
      },
      revenueProjection: {
        sellingPrice: 60,
        monthlySales: 3000,
        variableCostPerUnit: 35,
        fixedCostMonthly: 36000,
        growthRateAnnual: 15,
      },

      setMarginCapital: (capital) => set({ marginCapital: capital }),

      recalculateAll: (capital) => {
        const pc = calculateProjectCost(capital);
        const scheme: SchemeConfig | null = selectScheme(pc.totalProjectCost);

        let selectedSchemeData: SelectedScheme | null = null;
        let emiResult: EMIResult | null = null;
        let repayment: RepaymentSchedule | null = null;

        if (scheme) {
          const loanAmount = Math.min(pc.loanAmount, scheme.maxFunding);
          const tenureMonths = scheme.tenureYears * 12;
          emiResult = calculateEMI(loanAmount, scheme.interestRate, tenureMonths);
          repayment = generateRepaymentSchedule(
            loanAmount,
            scheme.interestRate,
            tenureMonths,
            scheme.moratoriumMonths
          );

          selectedSchemeData = {
            scheme,
            projectCost: pc.totalProjectCost,
            loanAmount,
            monthlyEMI: emiResult.monthlyEMI,
            totalInterest: emiResult.totalInterest,
            totalRepayment: emiResult.totalRepayment,
          };
        }

        set({
          marginCapital: capital,
          projectCost: pc,
          selectedScheme: selectedSchemeData,
          emiResult,
          repaymentSchedule: repayment,
        });
      },

      setOperatingCosts: (costs) => set({ operatingCosts: costs }),
      setWorkingCapitalInputs: (inputs) => set({ workingCapitalInputs: inputs }),
      setRevenueProjection: (projection) => set({ revenueProjection: projection }),
    }),
    {
      name: 'vyavsaymitra-finance',
    }
  )
);
