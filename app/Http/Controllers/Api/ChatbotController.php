<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChatSession;
use App\Models\ChatMessage;
use App\Models\Income;
use App\Models\Expense;
use App\Models\Budget;
use App\Models\SavingsGoal;
use App\Services\ChatbotLlmService;
use Carbon\Carbon;
use Illuminate\Http\Request;

class ChatbotController extends Controller
{
    public function __construct(private readonly ChatbotLlmService $llmService)
    {
    }

    public function sessions(Request $request)
    {
        $sessions = $request->user()->chatSessions()->orderBy('updated_at', 'desc')->get();
        return response()->json($sessions);
    }

    public function createSession(Request $request)
    {
        $request->validate([
            'title' => ['required', 'string', 'max:255'],
        ]);

        $session = $request->user()->chatSessions()->create([
            'title' => $request->title,
        ]);

        return response()->json($session, 201);
    }

    public function showSession(Request $request, ChatSession $chatSession)
    {
        if ($chatSession->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($chatSession->load('messages'));
    }

    public function deleteSession(Request $request, ChatSession $chatSession)
    {
        if ($chatSession->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $chatSession->delete();
        return response()->json(['message' => 'Chat session deleted successfully.']);
    }

    public function sendMessage(Request $request)
    {
        $request->validate([
            'message' => ['required', 'string'],
            'chat_session_id' => ['nullable', 'exists:chat_sessions,id'],
        ]);

        $user = $request->user();
        $messageText = $request->message;

        // Find or create session
        $sessionId = $request->chat_session_id;
        if (!$sessionId) {
            $session = $user->chatSessions()->create([
                'title' => substr($messageText, 0, 30) . '...',
            ]);
            $sessionId = $session->id;
        } else {
            $session = ChatSession::find($sessionId);
            if ($session->user_id !== $user->id) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        // 1. Save User Message
        ChatMessage::create([
            'chat_session_id' => $sessionId,
            'sender' => 'user',
            'message' => $messageText,
        ]);

        // 2. Fetch User Financial Context
        $now = Carbon::now();
        $startOfMonth = $now->copy()->startOfMonth();
        $endOfMonth = $now->copy()->endOfMonth();
        $currency = $user->setting?->currency ?? 'USD';

        $totalIncome = Income::where('user_id', $user->id)
            ->whereBetween('entry_date', [$startOfMonth, $endOfMonth])
            ->sum('amount');

        $totalExpense = Expense::where('user_id', $user->id)
            ->whereBetween('entry_date', [$startOfMonth, $endOfMonth])
            ->sum('amount');

        $budgets = Budget::where('user_id', $user->id)->with('category')->get()->map(function ($b) use ($user) {
            $spent = Expense::where('user_id', $user->id)
                ->where('category_id', $b->category_id)
                ->whereBetween('entry_date', [$b->start_date, $b->end_date])
                ->sum('amount');
            return "Category: " . ($b->category ? $b->category->name : 'Uncategorized') . ", Limit: " . $b->amount . ", Spent: " . $spent;
        })->toArray();

        $goals = SavingsGoal::where('user_id', $user->id)->where('status', 'active')->get()->map(function ($g) {
            return "Goal: " . $g->name . ", Target: " . $g->target_amount . ", Saved: " . $g->current_amount . ", Deadline: " . ($g->deadline ? $g->deadline->toDateString() : 'None');
        })->toArray();

        $aiResponseText = null;
        $aiData = ['intent' => 'chat_api'];

        // 3. Try to call the configured LLM API if a key exists.
        $systemPrompt = sprintf(
            "You are a Personal Finance AI Assistant. The user's preferred currency is %s. " .
            "Here is the user's real-time financial context for the current month:\n" .
            "- Total Income: %s %.2f\n" .
            "- Total Expenses: %s %.2f\n" .
            "- Active Budgets: %s\n" .
            "- Active Savings Goals: %s\n" .
            "Answer clearly and concisely. Use the financial data context to run calculations when asked. Do not use emojis. Keep answers under 150 words.",
            $currency,
            $currency,
            $totalIncome,
            $currency,
            $totalExpense,
            implode(' | ', $budgets) ?: 'None',
            implode(' | ', $goals) ?: 'None'
        );

        $aiResponseText = $this->llmService->complete($systemPrompt, $messageText);

        // 4. Fallback to dynamic, calculated, local financial engine if API fails or no key
        if (!$aiResponseText) {
            $parsedIntent = $this->parseIntentAndParams($messageText);
            $result = $this->executeFinancialEngine($user, $parsedIntent);
            $aiResponseText = $result['answer'];
            $aiData = $result['data'];
        }

        // 5. Save AI Message
        $aiMessage = ChatMessage::create([
            'chat_session_id' => $sessionId,
            'sender' => 'ai',
            'message' => $aiResponseText,
            'data' => $aiData,
        ]);

        $session->touch(); // Update updated_at timestamp

        return response()->json([
            'session_id' => $sessionId,
            'user_message' => $messageText,
            'ai_message' => $aiMessage,
        ]);
    }

    private function parseIntentAndParams(string $message): array
    {
        $message = strtolower($message);
        
        // Match Savings: "save 10000 with 4000 salary" or similar numbers
        // Patterns: save [amount] with [salary]
        if (preg_match('/save\s+([\d,.]+)(?:\s+with\s+([\d,.]+))?/i', $message, $matches)) {
            $target = (float)str_replace(',', '', $matches[1]);
            $income = isset($matches[2]) ? (float)str_replace(',', '', $matches[2]) : null;
            return [
                'intent' => 'savings_time',
                'params' => [
                    'target' => $target,
                    'income' => $income,
                ]
            ];
        }

        // Match Savings 2: "how long to save 5000"
        if (preg_match('/how\s+long\s+to\s+save\s+([\d,.]+)/i', $message, $matches)) {
            $target = (float)str_replace(',', '', $matches[1]);
            return [
                'intent' => 'savings_time',
                'params' => [
                    'target' => $target,
                    'income' => null,
                ]
            ];
        }

        // Match Budget details: contains "budget"
        if (str_contains($message, 'budget') || str_contains($message, 'limit') || str_contains($message, 'cap')) {
            return [
                'intent' => 'budget_check',
                'params' => []
            ];
        }

        // Match Expenses: contains "spend", "expense", "cost"
        if (str_contains($message, 'spend') || str_contains($message, 'expense') || str_contains($message, 'cost') || str_contains($message, 'outgoings')) {
            return [
                'intent' => 'expense_breakdown',
                'params' => []
            ];
        }

        // Match Health / Balance: contains "health", "score", "balance", "net"
        if (str_contains($message, 'health') || str_contains($message, 'score') || str_contains($message, 'balance') || str_contains($message, 'net')) {
            return [
                'intent' => 'financial_health',
                'params' => []
            ];
        }

        // Default Generic Intent
        return [
            'intent' => 'generic_help',
            'params' => []
        ];
    }

    private function executeFinancialEngine($user, array $parsed): array
    {
        $intent = $parsed['intent'];
        $params = $parsed['params'];
        $currency = $user->setting?->currency ?? 'USD';

        $now = Carbon::now();
        $startOfMonth = $now->copy()->startOfMonth();
        $endOfMonth = $now->copy()->endOfMonth();

        // Core dynamic user stats
        $userMonthlyIncome = Income::where('user_id', $user->id)
            ->whereBetween('entry_date', [$startOfMonth, $endOfMonth])
            ->sum('amount');

        $userMonthlyExpense = Expense::where('user_id', $user->id)
            ->whereBetween('entry_date', [$startOfMonth, $endOfMonth])
            ->sum('amount');

        switch ($intent) {
            case 'savings_time':
                $target = $params['target'];
                // Use input income, or user's real monthly income, or fallback $3,000
                $income = $params['income'] ?: ($userMonthlyIncome ?: 3000.0);
                
                // Calculate dynamic monthly saving: 25% of income
                $savingsRate = 0.25;
                $monthlySaving = $income * $savingsRate;
                $monthsNeeded = $target / $monthlySaving;
                
                $answer = sprintf(
                    "To save a total of %s %s with a monthly income of %s %s, assuming a healthy 25%% savings rate (%s %s saved/month), it will take you approximately %.1f months (or about %.0f days).",
                    $currency,
                    number_format($target),
                    $currency,
                    number_format($income),
                    $currency,
                    number_format($monthlySaving),
                    $monthsNeeded,
                    $monthsNeeded * 30.4
                );

                return [
                    'answer' => $answer,
                    'data' => [
                        'intent' => 'savings_time',
                        'target' => $target,
                        'income' => $income,
                        'savings_rate' => 25,
                        'monthly_saving' => $monthlySaving,
                        'months_needed' => round($monthsNeeded, 1),
                    ]
                ];

            case 'budget_check':
                $budgets = Budget::where('user_id', $user->id)->with('category')->get();
                if ($budgets->isEmpty()) {
                    return [
                        'answer' => "You don't have any budgets configured for this month. I recommend creating one for 'Groceries' or 'Dining Out' in the Budgets section to control your spending.",
                        'data' => ['intent' => 'budget_check', 'budgets_count' => 0]
                    ];
                }

                $lines = ["Here is a summary of your active budgets:"];
                $exceeded = 0;
                foreach ($budgets as $b) {
                    $spent = Expense::where('user_id', $user->id)
                        ->where('category_id', $b->category_id)
                        ->whereBetween('entry_date', [$b->start_date, $b->end_date])
                        ->sum('amount');
                    
                    $percent = $b->amount > 0 ? ($spent / $b->amount) * 100 : 0;
                    $status = $spent > $b->amount ? "EXCEEDED" : "Healthy";
                    if ($spent > $b->amount) $exceeded++;

                    $lines[] = sprintf(
                        "- *%s*: Spent %s %.2f / Limit %s %.2f (%.1f%% utilized) - %s",
                        $b->category ? $b->category->name : 'Uncategorized',
                        $currency,
                        $spent,
                        $currency,
                        $b->amount,
                        $percent,
                        $status
                    );
                }

                if ($exceeded > 0) {
                    $lines[] = "\nWarning: You have exceeded $exceeded of your budget caps. Pause non-essential purchases.";
                } else {
                    $lines[] = "\nAll your budget caps are currently healthy. Keep up the good work!";
                }

                return [
                    'answer' => implode("\n", $lines),
                    'data' => [
                        'intent' => 'budget_check',
                        'budgets_count' => $budgets->count(),
                        'exceeded_count' => $exceeded
                    ]
                ];

            case 'expense_breakdown':
                $expenses = Expense::where('expenses.user_id', $user->id)
                    ->whereBetween('expenses.entry_date', [$startOfMonth, $endOfMonth])
                    ->join('categories', 'expenses.category_id', '=', 'categories.id')
                    ->selectRaw('categories.name, sum(expenses.amount) as total')
                    ->groupBy('categories.id', 'categories.name')
                    ->orderBy('total', 'desc')
                    ->get();

                if ($expenses->isEmpty()) {
                    return [
                        'answer' => "You have no expenses recorded for this month. You're in the green!",
                        'data' => ['intent' => 'expense_breakdown', 'expenses_total' => 0]
                    ];
                }

                $total = $expenses->sum('total');
                $lines = [sprintf("Your total expenses for this month are %s %s. Here is the breakdown:", $currency, number_format($total, 2))];
                foreach ($expenses as $e) {
                    $pct = ($e->total / $total) * 100;
                    $lines[] = sprintf("- *%s*: %s %s (%.1f%%)", $e->name, $currency, number_format($e->total, 2), $pct);
                }

                return [
                    'answer' => implode("\n", $lines),
                    'data' => [
                        'intent' => 'expense_breakdown',
                        'expenses_total' => $total
                    ]
                ];

            case 'financial_health':
                // Compute Financial Score
                $score = 75; // Baseline
                $netBalance = $userMonthlyIncome - $userMonthlyExpense;
                $burnRate = $userMonthlyIncome > 0 ? ($userMonthlyExpense / $userMonthlyIncome) * 100 : 0;
                
                if ($userMonthlyIncome > 0) {
                    if ($burnRate <= 50) $score += 15;
                    elseif ($burnRate <= 75) $score += 5;
                    else $score -= 15;
                }

                $activeGoalsCount = SavingsGoal::where('user_id', $user->id)->where('status', 'active')->count();
                $score = max(0, min(100, $score + ($activeGoalsCount * 2)));

                $answer = sprintf(
                    "Your current Financial Health Score is %d/100.\n" .
                    "- Net monthly balance: %s %s (Incomes: %s %s | Expenses: %s %s)\n" .
                    "- Burn rate: %.1f%% of earnings spent.\n" .
                    "Recommendation: %s",
                    $score,
                    $currency,
                    number_format($netBalance, 2),
                    $currency,
                    number_format($userMonthlyIncome, 2),
                    $currency,
                    number_format($userMonthlyExpense, 2),
                    $burnRate,
                    $burnRate > 80 ? "Your burn rate is high. Consider setting tight limits on discretionary spendings like Dining Out or Entertainment." : "Your finances look solid. You can allocate extra savings to your goals."
                );

                return [
                    'answer' => $answer,
                    'data' => [
                        'intent' => 'financial_health',
                        'financial_score' => $score,
                        'monthly_net' => $netBalance,
                        'burn_rate' => $burnRate
                    ]
                ];

            default:
                return [
                    'answer' => "Hi there! I am your deterministic Finance AI Assistant. I can help you with:\n" .
                        "1. Calculating savings durations (e.g. 'How long to save 10,000 with 4,000 income')\n" .
                        "2. Analyzing your budget constraints (e.g. 'Show my budgets' or 'check limits')\n" .
                        "3. Inspecting spending distribution (e.g. 'breakdown my expenses')\n" .
                        "4. Reviewing your general financial score (e.g. 'check my financial health')",
                    'data' => ['intent' => 'generic_help']
                ];
        }
    }
}
