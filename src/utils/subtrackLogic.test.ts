import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advancePastBillingDate,
  calculateBudgetStatus,
  calculateOverview,
  calculateReport,
  checkDueNotifications,
  convertCurrencyAmount,
  createSampleSubscriptions,
  DEFAULT_TAGS,
  filterAndSortSubscriptions,
  generateCsvContent,
  generateIcsContent,
  toMonthlyCost,
  validateSubscriptionInput,
} from './subtrackLogic';
import { Subscription } from '../types/subtrack';

test('UC12: validateSubscriptionInput enforces name <= 60 chars, non-negative amount, and http/https URL', () => {
  const invalid1 = validateSubscriptionInput({
    name: '   ',
    amountInput: '-50000',
    nextBillingDate: '2026-11-27',
    managementUrl: 'ftp://invalid.com',
  });
  assert.equal(invalid1.isValid, false);
  assert.ok(invalid1.errors.name);
  assert.ok(invalid1.errors.amount);
  assert.ok(invalid1.errors.managementUrl);

  const longName = 'A'.repeat(61);
  const invalid2 = validateSubscriptionInput({
    name: longName,
    amountInput: '100000',
    nextBillingDate: '2026-11-27',
    managementUrl: '',
  });
  assert.equal(invalid2.isValid, false);
  assert.ok(invalid2.errors.name);

  const valid = validateSubscriptionInput({
    name: 'Netflix Premium',
    amountInput: '260000',
    nextBillingDate: '2026-11-27',
    managementUrl: 'https://netflix.com/account',
  });
  assert.equal(valid.isValid, true);
  assert.equal(valid.parsedAmount, 260000);
});

test('UC06: toMonthlyCost converts weekly, monthly, quarterly, and yearly accurately', () => {
  assert.equal(toMonthlyCost(120, 'monthly'), 120);
  assert.equal(toMonthlyCost(300, 'quarterly'), 100);
  assert.equal(toMonthlyCost(1200, 'yearly'), 100);
  assert.ok(Math.abs(toMonthlyCost(120, 'weekly') - (120 * 52) / 12) < 0.0001);
});

test('UC08/UC14: advancePastBillingDate rolls past dates forward to future cycle', () => {
  const rolled = advancePastBillingDate('2026-08-15', 'monthly', '2026-10-27');
  assert.equal(rolled, '2026-11-15');
});

test('UC01 & UC13: calculateOverview counts only active packages and due within 7 days', () => {
  const today = '2026-10-27';
  const samples = createSampleSubscriptions(today, 'VND');
  const overview = calculateOverview(samples, 'VND', today);
  assert.equal(overview.activeCount, 4);
  assert.equal(overview.dueIn7DaysCount, 2);
  assert.equal(overview.estimatedMonthlyCost, 881500);
});

test('UC05: filterAndSortSubscriptions searches by name/tag/platform/category and sorts', () => {
  const today = '2026-10-27';
  const samples = createSampleSubscriptions(today, 'VND');

  const byTag = filterAndSortSubscriptions(samples, DEFAULT_TAGS, {
    searchQuery: 'Gia đình',
    statusFilter: 'all',
    categoryFilter: 'all',
    sortBy: 'name',
  });
  assert.equal(byTag.length, 1);
  assert.equal(byTag[0].name, 'Netflix Premium 4K');

  const pausedOnly = filterAndSortSubscriptions(samples, DEFAULT_TAGS, {
    searchQuery: '',
    statusFilter: 'paused',
    categoryFilter: 'all',
    sortBy: 'date',
  });
  assert.equal(pausedOnly.length, 1);
  assert.equal(pausedOnly[0].name, 'Coursera Plus Quarterly');

  const sortedByCost = filterAndSortSubscriptions(samples, DEFAULT_TAGS, {
    searchQuery: '',
    statusFilter: 'active',
    categoryFilter: 'all',
    sortBy: 'cost',
  });
  assert.equal(sortedByCost[0].name, 'Figma Professional');
});

test('UC06: calculateReport groups > 6 active packages into "Các gói khác" and supports optional currency conversion', () => {
  const subs: Subscription[] = Array.from({ length: 8 }, (_, i) => ({
    id: `sub-${i + 1}`,
    name: `Gói ${i + 1}`,
    amount: (i + 1) * 10000,
    currency: 'VND',
    cycle: 'monthly',
    nextBillingDate: '2026-11-15',
    category: i % 2 === 0 ? 'Giải trí' : 'Công việc & Năng suất',
    status: 'active',
    reminderDays: 3,
    tagIds: [],
    platform: 'Google Play (Android)',
    managementUrl: '',
    notes: '',
    createdAt: '',
    updatedAt: '',
  }));

  subs.push({
    ...subs[0],
    id: 'sub-usd',
    name: 'ChatGPT Plus',
    amount: 20,
    currency: 'USD',
  });

  // Strict mode (autoConvertCurrency = false)
  const reportStrict = calculateReport(subs, 'VND', false);
  assert.equal(reportStrict.activeMatchingCount, 8);
  assert.equal(reportStrict.excludedCurrencyCount, 1);
  assert.equal(reportStrict.pieSlices.length, 7);
  assert.equal(reportStrict.pieSlices[6].isOther, true);

  // Auto-convert mode (autoConvertCurrency = true)
  const reportConverted = calculateReport(subs, 'VND', true);
  assert.equal(reportConverted.activeMatchingCount, 9);
  assert.equal(reportConverted.excludedCurrencyCount, 0);
  assert.equal(reportConverted.convertedCurrencyCount, 1);
  assert.equal(convertCurrencyAmount(20, 'USD', 'VND'), 20 * 25400);
});

test('Suggested Feature: calculateBudgetStatus computes safe, warning, and exceeded states', () => {
  assert.equal(calculateBudgetStatus(500000, 1000000).status, 'safe');
  assert.equal(calculateBudgetStatus(850000, 1000000).status, 'warning');
  assert.equal(calculateBudgetStatus(1200000, 1000000).status, 'exceeded');
});

test('UC08 & UC14: checkDueNotifications notifies once per billing cycle and skips already notified', () => {
  const today = '2026-10-27';
  const samples = createSampleSubscriptions(today, 'VND');

  const firstRun = checkDueNotifications(samples, true, today);
  assert.equal(firstRun.dueNotifications.length, 1);
  assert.equal(firstRun.dueNotifications[0].title, 'Netflix Premium 4K sắp đến hạn');

  const secondRun = checkDueNotifications(firstRun.updatedSubscriptions, true, today);
  assert.equal(secondRun.dueNotifications.length, 0);
});

test('UC09 & UC10: generateIcsContent and generateCsvContent produce valid formats', () => {
  const samples = createSampleSubscriptions('2026-10-27', 'VND');
  const ics = generateIcsContent(samples[0]);
  assert.ok(ics.includes('BEGIN:VCALENDAR'));
  assert.ok(ics.includes('RRULE:FREQ=MONTHLY;INTERVAL=1'));

  const csv = generateCsvContent(samples, DEFAULT_TAGS);
  assert.ok(csv.includes('Netflix Premium 4K'));
  assert.ok(csv.includes('Gia đình'));
});
