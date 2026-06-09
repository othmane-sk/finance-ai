<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\Income;
use App\Models\Budget;
use App\Models\SavingsGoal;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function dashboard(Request $request)
    {
        $user = $request->user();
        $currency = $user->setting?->currency ?? 'USD';

        $now = Carbon::now();
        $startOfMonth = $now->copy()->startOfMonth();
        $endOfMonth = $now->copy()->endOfMonth();

        // 1. Core KPIs
        $totalAllTimeIncome = Income::where('user_id', $user->id)->sum('amount');
        $totalAllTimeExpense = Expense::where('user_id', $user->id)->sum('amount');
        $totalBalance = $totalAllTimeIncome - $totalAllTimeExpense;

        $monthlyIncome = Income::where('user_id', $user->id)
            ->whereBetween('entry_date', [$startOfMonth, $endOfMonth])
            ->sum('amount');

        $monthlyExpense = Expense::where('user_id', $user->id)
            ->whereBetween('entry_date', [$startOfMonth, $endOfMonth])
            ->sum('amount');

        $monthlySavings = max(0, $monthlyIncome - $monthlyExpense);
        $savingsRate = $monthlyIncome > 0 ? ($monthlySavings / $monthlyIncome) * 100 : 0;

        // 2. Budget status
        $budgets = Budget::where('user_id', $user->id)->get();
        $exceededBudgetsCount = 0;
        $totalBudgetLimit = 0;
        $totalBudgetSpent = 0;

        foreach ($budgets as $budget) {
            $totalBudgetLimit += $budget->amount;
            $spent = Expense::where('user_id', $user->id)
                ->where('category_id', $budget->category_id)
                ->whereBetween('entry_date', [$budget->start_date, $budget->end_date])
                ->sum('amount');
            
            $totalBudgetSpent += $spent;
            if ($spent > $budget->amount) {
                $exceededBudgetsCount++;
            }
        }

        $budgetUtilization = $totalBudgetLimit > 0 ? ($totalBudgetSpent / $totalBudgetLimit) * 100 : 0;

        // 3. Financial Health Score
        $financialScore = 75; // Baseline
        if ($monthlyIncome > 0) {
            $burnRate = ($monthlyExpense / $monthlyIncome) * 100;
            if ($burnRate <= 50) {
                $financialScore += 15;
            } elseif ($burnRate <= 75) {
                $financialScore += 5;
            } elseif ($burnRate > 90) {
                $financialScore -= 20;
            } else {
                $financialScore -= 10;
            }
        }
        $financialScore -= ($exceededBudgetsCount * 8);
        
        $activeGoalsCount = SavingsGoal::where('user_id', $user->id)->where('status', 'active')->count();
        if ($activeGoalsCount > 0) {
            $financialScore += 5; // Reward goal tracking
        }

        $financialScore = max(0, min(100, $financialScore));

        // 4. Combined Recent Transactions (limit 5)
        $incomes = Income::where('user_id', $user->id)
            ->with('category')
            ->orderBy('entry_date', 'desc')
            ->orderBy('id', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($item) {
                $item->type = 'income';
                return $item;
            });

        $expenses = Expense::where('user_id', $user->id)
            ->with('category')
            ->orderBy('entry_date', 'desc')
            ->orderBy('id', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($item) {
                $item->type = 'expense';
                return $item;
            });

        $recentTransactions = $incomes->concat($expenses)
            ->sortByDesc(function ($transaction) {
                return $transaction->entry_date->toDateString() . '_' . $transaction->id;
            })
            ->take(5)
            ->values();

        // 5. Active goals
        $activeGoals = SavingsGoal::where('user_id', $user->id)
            ->where('status', 'active')
            ->orderBy('deadline', 'asc')
            ->limit(3)
            ->get()
            ->map(function ($goal) {
                $progress_percent = $goal->target_amount > 0 ? min(100, ($goal->current_amount / $goal->target_amount) * 100) : 0;
                return array_merge($goal->toArray(), [
                    'progress_percent' => (float)$progress_percent,
                ]);
            });

        // 6. Recent insights (limit 3)
        $recentInsights = $user->insights()
            ->orderBy('created_at', 'desc')
            ->limit(3)
            ->get();

        return response()->json([
            'kpis' => [
                'total_balance' => (float)$totalBalance,
                'monthly_income' => (float)$monthlyIncome,
                'monthly_expense' => (float)$monthlyExpense,
                'monthly_savings' => (float)$monthlySavings,
                'savings_rate' => (float)$savingsRate,
                'financial_score' => (int)$financialScore,
                'exceeded_budgets_count' => $exceededBudgetsCount,
                'budget_utilization' => (float)$budgetUtilization,
            ],
            'recent_transactions' => $recentTransactions,
            'active_goals' => $activeGoals,
            'recent_insights' => $recentInsights,
        ]);
    }

    public function charts(Request $request)
    {
        $user = $request->user();

        // 1. Monthly Trends (Last 6 Months)
        $monthlyTrends = [];
        for ($i = 5; $i >= 0; $i--) {
            $month = Carbon::now()->subMonths($i);
            $start = $month->copy()->startOfMonth();
            $end = $month->copy()->endOfMonth();

            $income = Income::where('user_id', $user->id)
                ->whereBetween('entry_date', [$start, $end])
                ->sum('amount');

            $expense = Expense::where('user_id', $user->id)
                ->whereBetween('entry_date', [$start, $end])
                ->sum('amount');

            $monthlyTrends[] = [
                'month' => $month->format('M Y'),
                'income' => (float)$income,
                'expense' => (float)$expense,
            ];
        }

        // 2. Category Distribution (Current Month Expenses)
        $now = Carbon::now();
        $start = $now->copy()->startOfMonth();
        $end = $now->copy()->endOfMonth();

        $expenseDistribution = Expense::where('expenses.user_id', $user->id)
            ->whereBetween('expenses.entry_date', [$start, $end])
            ->join('categories', 'expenses.category_id', '=', 'categories.id')
            ->select('categories.name', 'categories.color', 'categories.icon', DB::raw('SUM(expenses.amount) as total'))
            ->groupBy('categories.id', 'categories.name', 'categories.color', 'categories.icon')
            ->orderBy('total', 'desc')
            ->get()
            ->map(function ($item) {
                return [
                    'name' => $item->name,
                    'color' => $item->color,
                    'icon' => $item->icon,
                    'total' => (float)$item->total,
                ];
            });

        // 3. Category Distribution (Current Month Incomes)
        $incomeDistribution = Income::where('incomes.user_id', $user->id)
            ->whereBetween('incomes.entry_date', [$start, $end])
            ->join('categories', 'incomes.category_id', '=', 'categories.id')
            ->select('categories.name', 'categories.color', 'categories.icon', DB::raw('SUM(incomes.amount) as total'))
            ->groupBy('categories.id', 'categories.name', 'categories.color', 'categories.icon')
            ->orderBy('total', 'desc')
            ->get()
            ->map(function ($item) {
                return [
                    'name' => $item->name,
                    'color' => $item->color,
                    'icon' => $item->icon,
                    'total' => (float)$item->total,
                ];
            });

        return response()->json([
            'monthly_trends' => $monthlyTrends,
            'expense_distribution' => $expenseDistribution,
            'income_distribution' => $incomeDistribution,
        ]);
    }
}
