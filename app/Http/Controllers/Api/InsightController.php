<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Insight;
use App\Services\FinancialInsightService;
use Illuminate\Http\Request;

class InsightController extends Controller
{
    protected FinancialInsightService $insightService;

    public function __construct(FinancialInsightService $insightService)
    {
        $this->insightService = $insightService;
    }

    public function index(Request $request)
    {
        // First, check if the user has any insights. If not, auto-generate them.
        if ($request->user()->insights()->count() === 0) {
            $this->insightService->generateInsightsForUser($request->user());
        }

        $insights = $request->user()->insights()
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($insights);
    }

    public function refresh(Request $request)
    {
        $this->insightService->generateInsightsForUser($request->user());

        $insights = $request->user()->insights()
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($insights);
    }

    public function analyze(Request $request)
    {
        return $this->refresh($request);
    }

    public function markAsRead(Request $request, Insight $insight)
    {
        if ($insight->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $insight->update(['read_at' => now()]);

        return response()->json($insight);
    }

    public function destroy(Request $request, Insight $insight)
    {
        if ($insight->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $insight->delete();

        return response()->json(['message' => 'Insight deleted successfully.']);
    }
}
