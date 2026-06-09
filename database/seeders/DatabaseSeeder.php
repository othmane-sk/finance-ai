<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Category;
use App\Models\Income;
use App\Models\Expense;
use App\Models\Budget;
use App\Models\SavingsGoal;
use App\Models\Setting;
use App\Services\FinancialInsightService;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create or refresh the demo user. This keeps production seeding idempotent.
        $user = User::updateOrCreate(
            ['email' => 'demo@financeai.com'],
            [
                'name' => 'Demo User',
                'password' => Hash::make('password123'),
            ]
        );

        $user->chatSessions()->delete();
        $user->insights()->delete();
        $user->savingsGoals()->delete();
        $user->budgets()->delete();
        $user->expenses()->delete();
        $user->incomes()->delete();
        $user->categories()->delete();

        // 2. Settings
        Setting::updateOrCreate(
            ['user_id' => $user->id],
            [
                'theme' => 'dark',
                'currency' => 'USD',
                'email_notifications' => true,
            ]
        );

        // 3. Categories
        $incomeCats = [
            ['name' => 'Salary', 'color' => '#10B981', 'icon' => 'Briefcase'],
            ['name' => 'Freelance', 'color' => '#3B82F6', 'icon' => 'Laptop'],
            ['name' => 'Investments', 'color' => '#8B5CF6', 'icon' => 'TrendingUp'],
        ];

        $expenseCats = [
            ['name' => 'Housing & Rent', 'color' => '#EF4444', 'icon' => 'Home'],
            ['name' => 'Groceries', 'color' => '#F59E0B', 'icon' => 'ShoppingBag'],
            ['name' => 'Dining Out', 'color' => '#EC4899', 'icon' => 'Coffee'],
            ['name' => 'Utilities', 'color' => '#06B6D4', 'icon' => 'Zap'],
            ['name' => 'Transport', 'color' => '#6B7280', 'icon' => 'Car'],
            ['name' => 'Entertainment', 'color' => '#14B8A6', 'icon' => 'Film'],
        ];

        $categoriesMap = [];

        foreach ($incomeCats as $cat) {
            $created = Category::create([
                'user_id' => $user->id,
                'name' => $cat['name'],
                'type' => 'income',
                'color' => $cat['color'],
                'icon' => $cat['icon'],
            ]);
            $categoriesMap[$cat['name']] = $created->id;
        }

        foreach ($expenseCats as $cat) {
            $created = Category::create([
                'user_id' => $user->id,
                'name' => $cat['name'],
                'type' => 'expense',
                'color' => $cat['color'],
                'icon' => $cat['icon'],
            ]);
            $categoriesMap[$cat['name']] = $created->id;
        }

        // 4. Generate historical transactions over 6 months
        $now = Carbon::now();

        for ($i = 5; $i >= 0; $i--) {
            $monthDate = $now->copy()->subMonths($i);
            $year = $monthDate->year;
            $month = $monthDate->month;

            // Salary: On the 1st of the month
            Income::create([
                'user_id' => $user->id,
                'category_id' => $categoriesMap['Salary'],
                'amount' => 4500.00 + rand(-100, 200),
                'description' => 'Monthly Salary Payment',
                'entry_date' => Carbon::create($year, $month, 1),
            ]);

            // Freelance: Sometime mid-month
            if (rand(1, 10) > 3) {
                Income::create([
                    'user_id' => $user->id,
                    'category_id' => $categoriesMap['Freelance'],
                    'amount' => 650.00 + rand(-200, 400),
                    'description' => 'Freelance UI Design Client',
                    'entry_date' => Carbon::create($year, $month, rand(12, 18)),
                ]);
            }

            // Investments: 25th of the month
            Income::create([
                'user_id' => $user->id,
                'category_id' => $categoriesMap['Investments'],
                'amount' => 120.00 + rand(-20, 50),
                'description' => 'Stock Dividends & Interest',
                'entry_date' => Carbon::create($year, $month, 25),
            ]);

            // Expenses:
            // Rent: 5th of the month
            Expense::create([
                'user_id' => $user->id,
                'category_id' => $categoriesMap['Housing & Rent'],
                'amount' => 1200.00,
                'description' => 'Apartment Rent payment',
                'entry_date' => Carbon::create($year, $month, 5),
            ]);

            // Utilities: 10th of the month
            Expense::create([
                'user_id' => $user->id,
                'category_id' => $categoriesMap['Utilities'],
                'amount' => 180.00 + rand(-30, 40),
                'description' => 'Electricity, Gas & High-speed Internet bundle',
                'entry_date' => Carbon::create($year, $month, 10),
            ]);

            // Groceries: Weekly (four times per month)
            for ($w = 1; $w <= 4; $w++) {
                Expense::create([
                    'user_id' => $user->id,
                    'category_id' => $categoriesMap['Groceries'],
                    'amount' => 110.00 + rand(-20, 30),
                    'description' => 'Weekly grocery shopping at supermarket',
                    'entry_date' => Carbon::create($year, $month, ($w * 7) - rand(0, 2)),
                ]);
            }

            // Dining Out: 4 to 6 times a month
            $mealsCount = rand(4, 6);
            for ($m = 0; $m < $mealsCount; $m++) {
                Expense::create([
                    'user_id' => $user->id,
                    'category_id' => $categoriesMap['Dining Out'],
                    'amount' => 35.00 + rand(-15, 80),
                    'description' => 'Dinner out with friends / UberEats delivery',
                    'entry_date' => Carbon::create($year, $month, rand(2, 28)),
                ]);
            }

            // Transport: 3 to 4 times a month
            $transports = rand(3, 4);
            for ($t = 0; $t < $transports; $t++) {
                Expense::create([
                    'user_id' => $user->id,
                    'category_id' => $categoriesMap['Transport'],
                    'amount' => 45.00 + rand(-10, 15),
                    'description' => 'Gas station fill-up / Commute pass',
                    'entry_date' => Carbon::create($year, $month, rand(2, 28)),
                ]);
            }

            // Entertainment: 2 to 4 times a month
            $ents = rand(2, 4);
            for ($e = 0; $e < $ents; $e++) {
                // If it's the current month, we make one entertainment expense huge to trigger the anomaly alert!
                $isAnomalyMonth = ($i === 0 && $e === 0);
                Expense::create([
                    'user_id' => $user->id,
                    'category_id' => $categoriesMap['Entertainment'],
                    'amount' => $isAnomalyMonth ? 450.00 : (55.00 + rand(-30, 60)),
                    'description' => $isAnomalyMonth ? 'VIP Weekend Concert Ticket' : 'Movie tickets & streaming subscriptions',
                    'entry_date' => Carbon::create($year, $month, rand(2, 28)),
                ]);
            }
        }

        // 5. Budgets for the current month
        $currentStart = $now->copy()->startOfMonth();
        $currentEnd = $now->copy()->endOfMonth();

        Budget::create([
            'user_id' => $user->id,
            'category_id' => $categoriesMap['Groceries'],
            'amount' => 500.00,
            'period' => 'monthly',
            'start_date' => $currentStart,
            'end_date' => $currentEnd,
        ]);

        Budget::create([
            'user_id' => $user->id,
            'category_id' => $categoriesMap['Dining Out'],
            'amount' => 200.00, // Make it relatively low so they might be close to exceeding it
            'period' => 'monthly',
            'start_date' => $currentStart,
            'end_date' => $currentEnd,
        ]);

        Budget::create([
            'user_id' => $user->id,
            'category_id' => $categoriesMap['Entertainment'],
            'amount' => 300.00, // The VIP concert ticket ($450) will definitely exceed this!
            'period' => 'monthly',
            'start_date' => $currentStart,
            'end_date' => $currentEnd,
        ]);

        // 6. Savings Goals
        SavingsGoal::create([
            'user_id' => $user->id,
            'name' => 'Emergency Fund',
            'target_amount' => 12000.00,
            'current_amount' => 6400.00,
            'deadline' => $now->copy()->addMonths(6)->toDateString(),
            'status' => 'active',
        ]);

        SavingsGoal::create([
            'user_id' => $user->id,
            'name' => 'Summer Holiday',
            'target_amount' => 3000.00,
            'current_amount' => 2200.00,
            'deadline' => $now->copy()->addDays(12)->toDateString(), // Approaching deadline!
            'status' => 'active',
        ]);

        SavingsGoal::create([
            'user_id' => $user->id,
            'name' => 'New Development PC',
            'target_amount' => 2500.00,
            'current_amount' => 2500.00,
            'deadline' => $now->copy()->subDays(5)->toDateString(),
            'status' => 'completed',
        ]);

        // 7. Auto-generate insights using the service
        $insightService = new FinancialInsightService();
        $insightService->generateInsightsForUser($user);
    }
}
