<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Budget;
use App\Models\Expense;
use App\Services\FinancialInsightService;
use Illuminate\Http\Request;

class BudgetController extends Controller
{
    protected FinancialInsightService $insightService;

    public function __construct(FinancialInsightService $insightService)
    {
        $this->insightService = $insightService;
    }

    public function index(Request $request)
    {
        $budgets = $request->user()->budgets()->with('category')->get();

        $budgetsWithProgress = $budgets->map(function ($budget) use ($request) {
            $spent = 0;
            if ($budget->category_id) {
                $spent = Expense::where('user_id', $request->user()->id)
                    ->where('category_id', $budget->category_id)
                    ->whereBetween('entry_date', [$budget->start_date, $budget->end_date])
                    ->sum('amount');
            }

            $remaining = max(0, $budget->amount - $spent);
            $progress_percent = $budget->amount > 0 ? min(100, ($spent / $budget->amount) * 100) : 0;

            return [
                'id' => $budget->id,
                'category_id' => $budget->category_id,
                'category' => $budget->category,
                'amount' => $budget->amount,
                'period' => $budget->period,
                'start_date' => $budget->start_date ? \Carbon\Carbon::parse($budget->start_date)->toDateString() : null,
                'end_date' => $budget->end_date ? \Carbon\Carbon::parse($budget->end_date)->toDateString() : null,
                'spent' => (float)$spent,
                'remaining' => (float)$remaining,
                'progress_percent' => (float)$progress_percent,
                'exceeded' => $spent > $budget->amount,
            ];
        });

        return response()->json($budgetsWithProgress);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_id' => ['required', 'exists:categories,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'period' => ['required', 'string', 'in:monthly,yearly'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
        ]);

        // Verify category belongs to user
        $category = $request->user()->categories()->find($request->category_id);
        if (!$category) {
            return response()->json(['message' => 'Invalid category selected.'], 422);
        }

        $budget = $request->user()->budgets()->create($validated);

        // Regenerate insights
        $this->insightService->generateInsightsForUser($request->user());

        return response()->json($budget->load('category'), 201);
    }

    public function show(Request $request, Budget $budget)
    {
        if ($budget->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $spent = Expense::where('user_id', $request->user()->id)
            ->where('category_id', $budget->category_id)
            ->whereBetween('entry_date', [$budget->start_date, $budget->end_date])
            ->sum('amount');

        $remaining = max(0, $budget->amount - $spent);
        $progress_percent = $budget->amount > 0 ? min(100, ($spent / $budget->amount) * 100) : 0;

        $budgetData = array_merge($budget->load('category')->toArray(), [
            'spent' => (float)$spent,
            'remaining' => (float)$remaining,
            'progress_percent' => (float)$progress_percent,
            'exceeded' => $spent > $budget->amount,
        ]);

        return response()->json($budgetData);
    }

    public function update(Request $request, Budget $budget)
    {
        if ($budget->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'category_id' => ['required', 'exists:categories,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'period' => ['required', 'string', 'in:monthly,yearly'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
        ]);

        // Verify category belongs to user
        $category = $request->user()->categories()->find($request->category_id);
        if (!$category) {
            return response()->json(['message' => 'Invalid category selected.'], 422);
        }

        $budget->update($validated);

        // Regenerate insights
        $this->insightService->generateInsightsForUser($request->user());

        return response()->json($budget->load('category'));
    }

    public function destroy(Request $request, Budget $budget)
    {
        if ($budget->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $budget->delete();

        // Regenerate insights
        $this->insightService->generateInsightsForUser($request->user());

        return response()->json(['message' => 'Budget deleted successfully.']);
    }
}
