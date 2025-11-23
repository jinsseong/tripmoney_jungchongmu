import {
  Expense,
  SharedExpense,
  DailyParticipation,
  UserTotal,
  SettlementBalance,
  SettlementTransfer,
} from "./types";
import { getDateRange } from "./utils";

/**
 * 통합 정산 계산 (각 참여자가 부담해야 할 금액 계산)
 * 
 * 핵심 원리:
 * 1. 각 지출마다 참여자를 선택할 수 있음
 * 2. 참여한 사람들만 해당 지출을 n분의 1로 분담
 * 3. 참여하지 않은 사람은 자동으로 제외됨
 * 
 * 예시:
 * - A가 30,000원 지출 (참여자: A, B, C) -> 각자 10,000원 부담
 * - B가 20,000원 지출 (참여자: B, C만) -> B와 C만 각자 10,000원 부담 (A는 부담 없음)
 * - C가 15,000원 지출 (참여자: A, B, C) -> 각자 5,000원 부담
 * 
 * 결과:
 * - A: 10,000 + 0 + 5,000 = 15,000원 부담
 * - B: 10,000 + 10,000 + 5,000 = 25,000원 부담
 * - C: 10,000 + 10,000 + 5,000 = 25,000원 부담
 */
export function calculateConsolidatedSettlement(
  expenses: Expense[],
  sharedExpenses: SharedExpense[],
  dailyParticipations: DailyParticipation[],
  participants: { id: string; name: string }[]
): UserTotal[] {
  const userTotals: Record<string, UserTotal> = {};

  // Initialize user totals
  participants.forEach((participant) => {
    userTotals[participant.id] = {
      id: participant.id,
      name: participant.name,
      regularAmount: 0,
      sharedAmount: 0,
      totalAmount: 0,
    };
  });

  // Calculate regular expenses
  expenses.forEach((expense) => {
    // 날짜별 참여자가 있는 경우 (교통/숙박 등)
    if (expense.daily_participants && expense.daily_participants.length > 0) {
      // 날짜별로 그룹화
      const byDate: Record<string, string[]> = {};
      expense.daily_participants.forEach((dp) => {
        if (!byDate[dp.date]) {
          byDate[dp.date] = [];
        }
        byDate[dp.date].push(dp.participant_id);
      });

      const dates = Object.keys(byDate);
      if (dates.length === 0) return;

      // 총 금액을 날짜 수로 나눔
      const dailyAmount = Math.floor(expense.amount / dates.length);
      const dailyRemainder = expense.amount % dates.length;

      dates.forEach((date, dateIndex) => {
        const dayParticipants = byDate[date];
        if (dayParticipants.length === 0) return;

        // 해당 날짜의 금액을 참여자 수로 나눔
        const dateAmount = dailyAmount + (dateIndex === 0 ? dailyRemainder : 0);
        const perPerson = Math.floor(dateAmount / dayParticipants.length);
        const remainder = dateAmount % dayParticipants.length;

        dayParticipants.forEach((participantId, index) => {
          if (userTotals[participantId]) {
            userTotals[participantId].regularAmount +=
              perPerson + (index === 0 ? remainder : 0);
          }
        });
      });
    } else {
      // 일반 지출 (날짜별 참여자 없음)
      const participants = expense.expense_participants || [];
      if (participants.length === 0) return;

      if (expense.settlement_type === "equal") {
        const perPerson = Math.floor(expense.amount / participants.length);
        const remainder = expense.amount % participants.length;

        participants.forEach((participant, index) => {
          if (userTotals[participant.participant_id]) {
            userTotals[participant.participant_id].regularAmount +=
              perPerson + (index === 0 ? remainder : 0);
          }
        });
      } else {
        // Custom settlement
        participants.forEach((participant) => {
          if (userTotals[participant.participant_id] && participant.custom_amount) {
            userTotals[participant.participant_id].regularAmount +=
              participant.custom_amount;
          }
        });
      }
    }
  });

  // Calculate total amounts
  Object.values(userTotals).forEach((user) => {
    user.totalAmount = user.regularAmount + user.sharedAmount;
  });

  return Object.values(userTotals);
}

/**
 * 정산 잔액 계산 (실제 지불 금액과 부담 금액의 차이)
 * 
 * 핵심 원리:
 * 1. total_paid: 실제로 결제한 금액 (누가 카드를 긁었는지)
 * 2. total_owed: 부담해야 할 금액 (참여한 지출의 분담금 합계)
 * 3. net_balance = total_paid - total_owed
 *    - 양수(+): 다른 사람들이 이 사람에게 줘야 할 금액 (받을 돈)
 *    - 음수(-): 이 사람이 다른 사람들에게 줘야 할 금액 (낼 돈)
 *    - 0: 정산 완료
 * 
 * 예시 (위 케이스 계속):
 * - A: 지불 30,000원, 부담 15,000원 -> net_balance = +15,000원 (받을 돈)
 * - B: 지불 20,000원, 부담 25,000원 -> net_balance = -5,000원 (낼 돈)
 * - C: 지불 15,000원, 부담 25,000원 -> net_balance = -10,000원 (낼 돈)
 * 
 * 검증: 15,000 + (-5,000) + (-10,000) = 0 ✓ (합계는 항상 0이어야 함)
 */
export function calculateSettlementBalance(
  expenses: Expense[],
  sharedExpenses: SharedExpense[],
  userTotals: UserTotal[]
): SettlementBalance[] {
  const balances: Record<string, SettlementBalance> = {};

  // Initialize balances with total owed (부담 금액)
  userTotals.forEach((user) => {
    balances[user.id] = {
      participant_id: user.id,
      participant_name: user.name,
      total_paid: 0,
      total_owed: user.totalAmount,
      net_balance: -user.totalAmount,
    };
  });

  // Calculate total paid from expenses (실제 지불한 금액)
  expenses.forEach((expense) => {
    if (balances[expense.payer_id]) {
      balances[expense.payer_id].total_paid += expense.amount;
    }
  });

  // Calculate net balance (받을 금액 또는 낼 금액)
  Object.values(balances).forEach((balance) => {
    balance.net_balance = balance.total_paid - balance.total_owed;
  });

  return Object.values(balances);
}

/**
 * 최적화된 송금 계산 (최소 송금 횟수로 정산)
 * 
 * 핵심 원리:
 * 1. Greedy 알고리즘 사용
 * 2. 가장 많이 받을 사람과 가장 많이 낼 사람을 매칭
 * 3. 둘 중 작은 금액만큼 송금
 * 4. 잔액이 0이 되면 다음 사람으로 이동
 * 
 * 예시 (위 케이스 계속):
 * - 받을 사람: A(+15,000)
 * - 낼 사람: B(-5,000), C(-10,000)
 * 
 * 최적화 결과:
 * 1. C가 A에게 10,000원 송금 -> C 정산 완료
 * 2. B가 A에게 5,000원 송금 -> B와 A 정산 완료
 * 
 * 총 2번의 송금으로 정산 완료!
 * (비최적화 시: B->A, C->A, A->B 등 복잡한 송금 발생 가능)
 */
export function optimizeTransfers(
  balances: SettlementBalance[]
): SettlementTransfer[] {
  const receivers = balances
    .filter((b) => b.net_balance > 0)
    .sort((a, b) => b.net_balance - a.net_balance);

  const payers = balances
    .filter((b) => b.net_balance < 0)
    .sort((a, b) => a.net_balance - b.net_balance);

  const transfers: SettlementTransfer[] = [];

  while (receivers.length > 0 && payers.length > 0) {
    const receiver = receivers[0];
    const payer = payers[0];

    const amount = Math.min(
      receiver.net_balance,
      Math.abs(payer.net_balance)
    );

    transfers.push({
      from: {
        id: payer.participant_id,
        name: payer.participant_name,
      },
      to: {
        id: receiver.participant_id,
        name: receiver.participant_name,
      },
      amount: amount,
    });

    receiver.net_balance -= amount;
    payer.net_balance += amount;

    if (receiver.net_balance === 0) receivers.shift();
    if (payer.net_balance === 0) payers.shift();
  }

  return transfers;
}

/**
 * 정산 검증 함수 (합계가 0인지 확인)
 * 
 * 모든 net_balance의 합은 항상 0이어야 함
 * 만약 0이 아니면 계산 오류가 있는 것
 */
export function validateSettlement(balances: SettlementBalance[]): {
  isValid: boolean;
  totalBalance: number;
  message: string;
} {
  const totalBalance = balances.reduce((sum, b) => sum + b.net_balance, 0);
  const isValid = Math.abs(totalBalance) < 1; // 소수점 오차 허용 (1원 미만)

  return {
    isValid,
    totalBalance,
    message: isValid
      ? "정산 계산이 정확합니다."
      : `오류: 정산 합계가 ${totalBalance}원으로 0이 아닙니다. 계산을 확인해주세요.`,
  };
}

/**
 * 송금 검증 함수 (모든 송금이 정확한지 확인)
 */
export function validateTransfers(
  balances: SettlementBalance[],
  transfers: SettlementTransfer[]
): {
  isValid: boolean;
  message: string;
} {
  // 각 참여자의 송금 후 잔액 계산
  const finalBalances: Record<string, number> = {};
  
  balances.forEach((b) => {
    finalBalances[b.participant_id] = b.net_balance;
  });

  transfers.forEach((t) => {
    finalBalances[t.from.id] = (finalBalances[t.from.id] || 0) + t.amount;
    finalBalances[t.to.id] = (finalBalances[t.to.id] || 0) - t.amount;
  });

  // 모든 잔액이 0에 가까운지 확인
  const allZero = Object.values(finalBalances).every(
    (balance) => Math.abs(balance) < 1
  );

  return {
    isValid: allZero,
    message: allZero
      ? `총 ${transfers.length}번의 송금으로 정산 완료됩니다.`
      : "오류: 송금 계산이 정확하지 않습니다.",
  };
}

