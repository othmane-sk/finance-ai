<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SavingsGoal;
use App\Services\FinancialInsightService;
use Illuminate\Http\Request;

class SavingsGoalController extends Controller
{
    protected FinancialInsightService $insightService;

    public function __construct(FinancialInsightService $insightService)
    {
        $this->insightService = $insightService;
    }

    public function index(Request $request)
    {
        $goals = $request->user()->savingsGoals()->orderBy('created_at', 'desc')->get();

        $goalsWithProgress = $goals->map(function ($goal) {
            $progress_percent = $goal->target_amount > 0 ? min(100, ($goal->current_amount / $goal->target_amount) * 100) : 0;
            $remaining = max(0, $goal->target_amount - $goal->current_amount);
            return array_merge($goal->toArray(), [
                'progress_percent' => (float)$progress_percent,
                'remaining' => (float)$remaining,
            ]);
        });

        return response()->json($goalsWithProgress);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'target_amount' => ['required', 'numeric', 'min:0.01'],
            'current_amount' => ['nullable', 'numeric', 'min:0'],
            'deadline' => ['nullable', 'date', 'after:today'],
            'status' => ['nullable', 'in:active,completed,failed'],
        ]);

        $goal = $request->user()->savingsGoals()->create($validated);

        // Regenerate insights
        $this->insightService->generateInsightsForUser($request->user());

        return response()->json($goal, 201);
    }

    public function show(Request $request, SavingsGoal $savingsGoal)
    {
        if ($savingsGoal->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $progress_percent = $savingsGoal->target_amount > 0 ? min(100, ($savingsGoal->current_amount / $savingsGoal->target_amount) * 100) : 0;
        $remaining = max(0, $savingsGoal->target_amount - $savingsGoal->current_amount);

        $goalData = array_merge($savingsGoal->toArray(), [
            'progress_percent' => (float)$progress_percent,
            'remaining' => (float)$remaining,
        ]);

        return response()->json($goalData);
    }

    public function update(Request $request, SavingsGoal $savingsGoal)
    {
        if ($savingsGoal->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'target_amount' => ['required', 'numeric', 'min:0.01'],
            'current_amount' => ['required', 'numeric', 'min:0'],
            'deadline' => ['nullable', 'date'],
            'status' => ['required', 'in:active,completed,failed'],
        ]);

        // Auto-complete status if target reached
        if ($validated['current_amount'] >= $validated['target_amount']) {
            $validated['status'] = 'completed';
        }

        $savingsGoal->update($validated);

        // Regenerate insights
        $this->insightService->generateInsightsForUser($request->user());

        return response()->json($savingsGoal);
    }

    public function contribute(Request $request, SavingsGoal $savingsGoal)
    {
        if ($savingsGoal->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
        ]);

        $newAmount = $savingsGoal->current_amount + $validated['amount'];
        $status = $newAmount >= $savingsGoal->target_amount ? 'completed' : $savingsGoal->status;

        $savingsGoal->update([
            'current_amount' => $newAmount,
            'status' => $status,
        ]);

        // Regenerate insights
        $this->insightService->generateInsightsForUser($request->user());

        return response()->json($savingsGoal);
    }

    public function destroy(Request $request, SavingsGoal $savingsGoal)
    {
        if ($savingsGoal->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $savingsGoal->delete();

        // Regenerate insights
        $this->insightService->generateInsightsForUser($request->user());

        return response()->json(['message' => 'Savings goal deleted successfully.']);
    }
}
