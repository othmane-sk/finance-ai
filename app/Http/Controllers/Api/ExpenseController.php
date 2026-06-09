<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Services\FinancialInsightService;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    protected FinancialInsightService $insightService;

    public function __construct(FinancialInsightService $insightService)
    {
        $this->insightService = $insightService;
    }

    public function index(Request $request)
    {
        $query = $request->user()->expenses()->with('category');

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->filled('start_date')) {
            $query->where('entry_date', '>=', $request->start_date);
        }

        if ($request->filled('end_date')) {
            $query->where('entry_date', '<=', $request->end_date);
        }

        if ($request->filled('search')) {
            $query->where('description', 'like', '%' . $request->search . '%');
        }

        $expenses = $query->orderBy('entry_date', 'desc')
            ->orderBy('id', 'desc')
            ->paginate(15);

        return response()->json($expenses);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_id' => ['nullable', 'exists:categories,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'description' => ['nullable', 'string', 'max:255'],
            'entry_date' => ['required', 'date'],
        ]);

        // Verify category belongs to user and is type 'expense'
        if ($request->filled('category_id')) {
            $category = $request->user()->categories()->find($request->category_id);
            if (!$category || $category->type !== 'expense') {
                return response()->json(['message' => 'Invalid category selected.'], 422);
            }
        }

        $expense = $request->user()->expenses()->create($validated);

        // Regenerate insights
        $this->insightService->generateInsightsForUser($request->user());

        return response()->json($expense->load('category'), 201);
    }

    public function show(Request $request, Expense $expense)
    {
        if ($expense->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($expense->load('category'));
    }

    public function update(Request $request, Expense $expense)
    {
        if ($expense->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'category_id' => ['nullable', 'exists:categories,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'description' => ['nullable', 'string', 'max:255'],
            'entry_date' => ['required', 'date'],
        ]);

        // Verify category belongs to user and is type 'expense'
        if ($request->filled('category_id')) {
            $category = $request->user()->categories()->find($request->category_id);
            if (!$category || $category->type !== 'expense') {
                return response()->json(['message' => 'Invalid category selected.'], 422);
            }
        }

        $expense->update($validated);

        // Regenerate insights
        $this->insightService->generateInsightsForUser($request->user());

        return response()->json($expense->load('category'));
    }

    public function destroy(Request $request, Expense $expense)
    {
        if ($expense->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $expense->delete();

        // Regenerate insights
        $this->insightService->generateInsightsForUser($request->user());

        return response()->json(['message' => 'Expense deleted successfully.']);
    }

    public function breakdown(Request $request)
    {
        $user = $request->user();
        $now = \Carbon\Carbon::now();
        $start = $now->copy()->startOfMonth();
        $end = $now->copy()->endOfMonth();

        $expenseDistribution = Expense::where('expenses.user_id', $user->id)
            ->whereBetween('expenses.entry_date', [$start, $end])
            ->join('categories', 'expenses.category_id', '=', 'categories.id')
            ->select('categories.name', 'categories.color', 'categories.icon', \Illuminate\Support\Facades\DB::raw('SUM(expenses.amount) as total'))
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

        return response()->json($expenseDistribution);
    }
}
