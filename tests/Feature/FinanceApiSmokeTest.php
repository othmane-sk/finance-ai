<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinanceApiSmokeTest extends TestCase
{
    use RefreshDatabase;

    public function test_core_finance_api_flow_is_operational(): void
    {
        $register = $this->postJson('/api/register', [
            'name' => 'Smoke Tester',
            'email' => 'smoke@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertCreated();

        $token = $register->json('access_token');

        $headers = ['Authorization' => 'Bearer ' . $token];

        $categories = $this->withHeaders($headers)
            ->getJson('/api/categories')
            ->assertOk()
            ->json();

        $expenseCategory = collect($categories)->firstWhere('type', 'expense');

        $this->withHeaders($headers)
            ->postJson('/api/expenses', [
                'category_id' => $expenseCategory['id'],
                'amount' => 125.50,
                'description' => 'Smoke test groceries',
                'entry_date' => now()->toDateString(),
            ])
            ->assertCreated();

        $budget = $this->withHeaders($headers)
            ->postJson('/api/budgets', [
                'category_id' => $expenseCategory['id'],
                'amount' => 100,
                'period' => 'monthly',
                'start_date' => now()->startOfMonth()->toDateString(),
                'end_date' => now()->endOfMonth()->toDateString(),
            ])
            ->assertCreated()
            ->json();

        $this->withHeaders($headers)
            ->getJson('/api/budgets')
            ->assertOk()
            ->assertJsonFragment([
                'id' => $budget['id'],
                'exceeded' => true,
            ]);

        $goal = $this->withHeaders($headers)
            ->postJson('/api/savings-goals', [
                'name' => 'Emergency buffer',
                'target_amount' => 1000,
                'current_amount' => 100,
                'deadline' => now()->addMonth()->toDateString(),
                'status' => 'active',
            ])
            ->assertCreated()
            ->json();

        $this->withHeaders($headers)
            ->getJson('/api/savings-goals/' . $goal['id'])
            ->assertOk()
            ->assertJsonFragment(['name' => 'Emergency buffer']);

        $this->withHeaders($headers)
            ->postJson('/api/insights/analyze')
            ->assertOk()
            ->assertJsonFragment(['type' => 'danger']);

        $this->withHeaders($headers)
            ->getJson('/api/analytics/dashboard')
            ->assertOk()
            ->assertJsonPath('kpis.exceeded_budgets_count', 1);

        $this->withHeaders($headers)
            ->postJson('/api/chat', [
                'message' => 'Check my monthly budgets',
            ])
            ->assertOk()
            ->assertJsonPath('ai_message.sender', 'ai');
    }
}
