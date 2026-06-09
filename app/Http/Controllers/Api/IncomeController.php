<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Income;
use App\Services\FinancialInsightService;
use Illuminate\Http\Request;

class IncomeController extends Controller
{
    protected FinancialInsightService $insightService;

    public function __construct(FinancialInsightService $insightService)
    {
        $this->insightService = $insightService;
    }

    public function index(Request $request)
    {
        $query = $request->user()->incomes()->with('category');

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

        $incomes = $query->orderBy('entry_date', 'desc')
            ->orderBy('id', 'desc')
            ->paginate(15);

        return response()->json($incomes);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_id' => ['nullable', 'exists:categories,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'description' => ['nullable', 'string', 'max:255'],
            'entry_date' => ['required', 'date'],
        ]);

        // Verify category belongs to user and is type 'income'
        if ($request->filled('category_id')) {
            $category = $request->user()->categories()->find($request->category_id);
            if (!$category || $category->type !== 'income') {
                return response()->json(['message' => 'Invalid category selected.'], 422);
            }
        }

        $income = $request->user()->incomes()->create($validated);

        // Regenerate insights
        $this->insightService->generateInsightsForUser($request->user());

        return response()->json($income->load('category'), 201);
    }

    public function show(Request $request, Income $income)
    {
        if ($income->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($income->load('category'));
    }

    public function update(Request $request, Income $income)
    {
        if ($income->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'category_id' => ['nullable', 'exists:categories,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'description' => ['nullable', 'string', 'max:255'],
            'entry_date' => ['required', 'date'],
        ]);

        // Verify category belongs to user and is type 'income'
        if ($request->filled('category_id')) {
            $category = $request->user()->categories()->find($request->category_id);
            if (!$category || $category->type !== 'income') {
                return response()->json(['message' => 'Invalid category selected.'], 422);
            }
        }

        $income->update($validated);

        // Regenerate insights
        $this->insightService->generateInsightsForUser($request->user());

        return response()->json($income->load('category'));
    }

    public function destroy(Request $request, Income $income)
    {
        if ($income->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $income->delete();

        // Regenerate insights
        $this->insightService->generateInsightsForUser($request->user());

        return response()->json(['message' => 'Income deleted successfully.']);
    }
}
