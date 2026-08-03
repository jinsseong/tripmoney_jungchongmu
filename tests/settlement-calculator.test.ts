import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateConsolidatedSettlement,
  calculateSettlementBalance,
  optimizeTransfers,
  validateSettlement,
  validateTransfers,
} from "../lib/settlement-calculator";
import type { Expense, SettlementBalance } from "../lib/types";

const participants = [
  { id: "a", name: "민수" },
  { id: "b", name: "지영" },
  { id: "c", name: "현우" },
];

function createExpense(overrides: Partial<Expense>): Expense {
  return {
    id: "expense-1",
    trip_id: "trip-1",
    amount: 0,
    item_name: "테스트 지출",
    payer_id: "a",
    payment_type: "card",
    currency: "KRW",
    settlement_type: "equal",
    date: "2026-08-01",
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

test("균등 분할은 1원 단위 나머지를 첫 참여자에게 배정한다", () => {
  const totals = calculateConsolidatedSettlement(
    [
      createExpense({
        amount: 100,
        expense_participants: [
          { id: "ep-1", expense_id: "expense-1", participant_id: "a" },
          { id: "ep-2", expense_id: "expense-1", participant_id: "b" },
          { id: "ep-3", expense_id: "expense-1", participant_id: "c" },
        ],
      }),
    ],
    [],
    [],
    participants
  );

  assert.deepEqual(
    totals.map((total) => [total.id, total.regularAmount, total.totalAmount]),
    [
      ["a", 34, 34],
      ["b", 33, 33],
      ["c", 33, 33],
    ]
  );
});

test("날짜별 참여자는 날짜 금액과 해당 날짜 참석자만 기준으로 분담한다", () => {
  const totals = calculateConsolidatedSettlement(
    [
      createExpense({
        id: "lodging-1",
        amount: 10003,
        item_name: "숙박",
        daily_participants: [
          { id: "dp-1", expense_id: "lodging-1", participant_id: "a", date: "2026-08-01", created_at: "" },
          { id: "dp-2", expense_id: "lodging-1", participant_id: "b", date: "2026-08-01", created_at: "" },
          { id: "dp-3", expense_id: "lodging-1", participant_id: "b", date: "2026-08-02", created_at: "" },
          { id: "dp-4", expense_id: "lodging-1", participant_id: "c", date: "2026-08-02", created_at: "" },
          { id: "dp-5", expense_id: "lodging-1", participant_id: "a", date: "2026-08-03", created_at: "" },
          { id: "dp-6", expense_id: "lodging-1", participant_id: "c", date: "2026-08-03", created_at: "" },
        ],
      }),
    ],
    [],
    [],
    participants
  );

  assert.deepEqual(
    totals.map((total) => [total.id, total.regularAmount]),
    [
      ["a", 3335],
      ["b", 3334],
      ["c", 3334],
    ]
  );
});

test("지출별 선택 참여자는 참여하지 않은 사람을 부담액에서 제외한다", () => {
  const totals = calculateConsolidatedSettlement(
    [
      createExpense({
        id: "meal-1",
        amount: 30000,
        payer_id: "a",
        expense_participants: [
          { id: "ep-1", expense_id: "meal-1", participant_id: "a" },
          { id: "ep-2", expense_id: "meal-1", participant_id: "b" },
        ],
      }),
      createExpense({
        id: "taxi-1",
        amount: 12000,
        payer_id: "c",
        expense_participants: [
          { id: "ep-3", expense_id: "taxi-1", participant_id: "b" },
          { id: "ep-4", expense_id: "taxi-1", participant_id: "c" },
        ],
      }),
    ],
    [],
    [],
    [...participants, { id: "d", name: "서연" }]
  );

  assert.deepEqual(
    totals.map((total) => [total.id, total.regularAmount]),
    [
      ["a", 15000],
      ["b", 21000],
      ["c", 6000],
      ["d", 0],
    ]
  );
});

test("선택 참여자 기준 부담액과 실제 결제액으로 최종 송금을 계산한다", () => {
  const expenses = [
    createExpense({
      id: "meal-1",
      amount: 30000,
      payer_id: "a",
      expense_participants: [
        { id: "ep-1", expense_id: "meal-1", participant_id: "a" },
        { id: "ep-2", expense_id: "meal-1", participant_id: "b" },
      ],
    }),
    createExpense({
      id: "taxi-1",
      amount: 12000,
      payer_id: "c",
      expense_participants: [
        { id: "ep-3", expense_id: "taxi-1", participant_id: "b" },
        { id: "ep-4", expense_id: "taxi-1", participant_id: "c" },
      ],
    }),
  ];
  const totals = calculateConsolidatedSettlement(
    expenses,
    [],
    [],
    participants
  );
  const balances = calculateSettlementBalance(expenses, [], totals);
  const transfers = optimizeTransfers(balances);

  assert.deepEqual(
    balances.map((balance) => [
      balance.participant_id,
      balance.total_paid,
      balance.total_owed,
      balance.net_balance,
    ]),
    [
      ["a", 30000, 15000, 15000],
      ["b", 0, 21000, -21000],
      ["c", 12000, 6000, 6000],
    ]
  );
  assert.deepEqual(transfers, [
    { from: { id: "b", name: "지영" }, to: { id: "a", name: "민수" }, amount: 15000 },
    { from: { id: "b", name: "지영" }, to: { id: "c", name: "현우" }, amount: 6000 },
  ]);
  assert.equal(validateSettlement(balances).isValid, true);
  assert.equal(validateTransfers(balances, transfers).isValid, true);
});

test("직접 정산은 선택된 참여자의 입력 금액을 그대로 부담액으로 사용한다", () => {
  const expenses = [
    createExpense({
      id: "activity-1",
      amount: 45000,
      payer_id: "a",
      settlement_type: "custom",
      expense_participants: [
        { id: "ep-1", expense_id: "activity-1", participant_id: "a", custom_amount: 20000 },
        { id: "ep-2", expense_id: "activity-1", participant_id: "b", custom_amount: 5000 },
        { id: "ep-3", expense_id: "activity-1", participant_id: "c", custom_amount: 20000 },
      ],
    }),
  ];
  const totals = calculateConsolidatedSettlement(
    expenses,
    [],
    [],
    participants
  );
  const balances = calculateSettlementBalance(expenses, [], totals);
  const transfers = optimizeTransfers(balances);

  assert.deepEqual(
    totals.map((total) => [total.id, total.regularAmount]),
    [
      ["a", 20000],
      ["b", 5000],
      ["c", 20000],
    ]
  );
  assert.deepEqual(transfers, [
    { from: { id: "c", name: "현우" }, to: { id: "a", name: "민수" }, amount: 20000 },
    { from: { id: "b", name: "지영" }, to: { id: "a", name: "민수" }, amount: 5000 },
  ]);
});

test("지불 금액과 부담 금액으로 받을 돈과 낼 돈을 계산한다", () => {
  const expenses = [
    createExpense({ id: "e-a", amount: 30000, payer_id: "a" }),
    createExpense({ id: "e-b", amount: 20000, payer_id: "b" }),
    createExpense({ id: "e-c", amount: 15000, payer_id: "c" }),
  ];

  const balances = calculateSettlementBalance(expenses, [], [
    { id: "a", name: "민수", regularAmount: 15000, sharedAmount: 0, totalAmount: 15000 },
    { id: "b", name: "지영", regularAmount: 25000, sharedAmount: 0, totalAmount: 25000 },
    { id: "c", name: "현우", regularAmount: 25000, sharedAmount: 0, totalAmount: 25000 },
  ]);

  assert.deepEqual(
    balances.map((balance) => [balance.participant_id, balance.total_paid, balance.total_owed, balance.net_balance]),
    [
      ["a", 30000, 15000, 15000],
      ["b", 20000, 25000, -5000],
      ["c", 15000, 25000, -10000],
    ]
  );
  assert.equal(validateSettlement(balances).isValid, true);
});

test("송금 최적화는 최소 송금안을 만들고 원본 잔액을 변경하지 않는다", () => {
  const balances: SettlementBalance[] = [
    { participant_id: "a", participant_name: "민수", total_paid: 30000, total_owed: 15000, net_balance: 15000 },
    { participant_id: "b", participant_name: "지영", total_paid: 20000, total_owed: 25000, net_balance: -5000 },
    { participant_id: "c", participant_name: "현우", total_paid: 15000, total_owed: 25000, net_balance: -10000 },
  ];
  const originalBalances = structuredClone(balances);

  const transfers = optimizeTransfers(balances);

  assert.deepEqual(transfers, [
    { from: { id: "c", name: "현우" }, to: { id: "a", name: "민수" }, amount: 10000 },
    { from: { id: "b", name: "지영" }, to: { id: "a", name: "민수" }, amount: 5000 },
  ]);
  assert.deepEqual(balances, originalBalances);
  assert.equal(validateTransfers(balances, transfers).isValid, true);
});
