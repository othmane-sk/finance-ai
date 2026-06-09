<?php

namespace App\Services;

use App\Models\User;
use App\Models\Insight;
use App\Models\Expense;
use App\Models\Income;
use App\Models\Budget;
use App\Models\SavingsGoal;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class FinancialInsightService
{
    public function generateInsightsForUser(User $user): void
    {
        // Clear older insights to keep it fresh
        Insight::where('user_id', $user->id)->delete();

        $now = Carbon::now();
        $startOfMonth = $now->copy()->startOfMonth();
        $endOfMonth = $now->copy()->endOfMonth();

        // 1. Calculate general numbers
        $totalIncome = Income::where('user_id', $user->id)
            ->whereBetween('entry_date', [$startOfMonth, $endOfMonth])
            ->sum('amount');

        $totalExpense = Expense::where('user_id', $user->id)
            ->whereBetween('entry_date', [$startOfMonth, $endOfMonth])
            ->sum('amount');

        // General Info Insight
        if ($totalIncome == 0 && $totalExpense == 0) {
            Insight::create([
                'user_id' => $user->id,
                'type' => 'info',
                'title' => 'Welcome to Finance AI',
                'content' => 'Add your incomes and expenses to get personalized, AI-driven financial insights and recommendations based on your spending habits.',
            ]);
            return;
        }

        // 2. Budget Exceeded Alert
        $budgets = Budget::where('user_id', $user->id)
            ->with('category')
            ->get();

        foreach ($budgets as $budget) {
            if (!$budget->category_id) continue;

            $spent = Expense::where('user_id', $user->id)
                ->where('category_id', $budget->category_id)
                ->whereBetween('entry_date', [$budget->start_date, $budget->end_date])
                ->sum('amount');

            if ($spent > $budget->amount) {
                $exceeded = $spent - $budget->amount;
                Insight::create([
                    'user_id' => $user->id,
                    'type' => 'danger',
                    'title' => 'Budget Exceeded: ' . ($budget->category ? $budget->category->name : 'Uncategorized'),
                    'content' => sprintf(
                        'You have spent %s %.2f, which exceeds your monthly budget of %s %.2f by %s %.2f. Consider freezing expenses in this category.',
                        $user->setting?->currency ?? 'USD',
                        $spent,
                        $user->setting?->currency ?? 'USD',
                        $budget->amount,
                        $user->setting?->currency ?? 'USD',
                        $exceeded
                    ),
                ]);
            } elseif ($spent > ($budget->amount * 0.85)) {
                $remaining = $budget->amount - $spent;
                Insight::create([
                    'user_id' => $user->id,
                    'type' => 'warning',
                    'title' => 'Approaching Budget Limit: ' . ($budget->category ? $budget->category->name : 'Uncategorized'),
                    'content' => sprintf(
                        'You have used %.1f%% of your budget for %s. Only %s %.2f is remaining for this month.',
                        ($spent / $budget->amount) * 100,
                        ($budget->category ? $budget->category->name : 'Uncategorized'),
                        $user->setting?->currency ?? 'USD',
                        $remaining
                    ),
                ]);
            }
        }

        // 3. High Spending Alert
        if ($totalIncome > 0) {
            $burnRate = ($totalExpense / $totalIncome) * 100;
            if ($burnRate > 90) {
                Insight::create([
                    'user_id' => $user->id,
                    'type' => 'danger',
                    'title' => 'Critical High Spending Alert',
                    'content' => sprintf(
                        'Your monthly expenses are at %.1f%% of your total income. You only have %s %.2f left. We recommend pausing all discretionary spending immediately.',
                        $burnRate,
                        $user->setting?->currency ?? 'USD',
                        $totalIncome - $totalExpense
                    ),
                ]);
            } elseif ($burnRate > 75) {
                Insight::create([
                    'user_id' => $user->id,
                    'type' => 'warning',
                    'title' => 'High Monthly Spending',
                    'content' => sprintf(
                        'Your expenses represent %.1f%% of your monthly income. You have saved %.1f%%. Try tracking your minor expenses to optimize your balance.',
                        $burnRate,
                        100 - $burnRate
                    ),
                ]);
            } elseif ($burnRate < 50 && $totalExpense > 0) {
                Insight::create([
                    'user_id' => $user->id,
                    'type' => 'success',
                    'title' => 'Excellent Cash Flow Management',
                    'content' => sprintf(
                        'Amazing work! You have spent only %.1f%% of your income this month. Your current savings rate is %.1f%%, placing you in an excellent position to achieve your savings goals.',
                        $burnRate,
                        100 - $burnRate
                    ),
                ]);
            }
        }

        // 4. Anomaly detection (unusually large expense)
        $avgExpense = Expense::where('user_id', $user->id)
            ->where('entry_date', '>=', $now->copy()->subDays(30))
            ->avg('amount');

        if ($avgExpense > 0) {
            $unusualExpenses = Expense::where('user_id', $user->id)
                ->where('entry_date', '>=', $now->copy()->subDays(7))
                ->where('amount', '>', $avgExpense * 2.5)
                ->with('category')
                ->get();

            foreach ($unusualExpenses as $expense) {
                Insight::create([
                    'user_id' => $user->id,
                    'type' => 'warning',
                    'title' => 'Unusual Transaction Detected',
                    'content' => sprintf(
                        'A payment of %s %.2f for "%s" (%s) is significantly higher than your average transaction size of %s %.2f. Make sure this was planned.',
                        $user->setting?->currency ?? 'USD',
                        $expense->amount,
                        $expense->description ?? 'No description',
                        $expense->category ? $expense->category->name : 'Uncategorized',
                        $user->setting?->currency ?? 'USD',
                        $avgExpense
                    ),
                ]);
            }
        }

        // 5. Goal Progression Alerts
        $goals = SavingsGoal::where('user_id', $user->id)
            ->where('status', 'active')
            ->get();

        foreach ($goals as $goal) {
            if ($goal->deadline) {
                $daysRemaining = $now->diffInDays($goal->deadline, false);
                $percent = ($goal->current_amount / $goal->target_amount) * 100;

                if ($daysRemaining > 0 && $daysRemaining <= 15 && $percent < 80) {
                    Insight::create([
                        'user_id' => $user->id,
                        'type' => 'warning',
                        'title' => 'Goal Deadline Approaching: ' . $goal->name,
                        'content' => sprintf(
                            'Your goal "%s" ends in %d days, but you have only achieved %.1f%% of your goal (%s %.2f of %s %.2f). Try making a boost contribution.',
                            $goal->name,
                            $daysRemaining,
                            $percent,
                            $user->setting?->currency ?? 'USD',
                            $goal->current_amount,
                            $user->setting?->currency ?? 'USD',
                            $goal->target_amount
                        ),
                    ]);
                }
            }
        }

        // 6. Generic rule if user is doing fine
        if (Insight::where('user_id', $user->id)->count() === 0) {
            Insight::create([
                'user_id' => $user->id,
                'type' => 'info',
                'title' => 'Smart Savings Strategy',
                'content' => 'Set up a recurring transfer on your payday to pay yourself first. Put 20% of your earnings directly into a savings goal to avoid spending it.',
            ]);
        }
    }
}
