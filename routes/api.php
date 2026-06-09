<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\IncomeController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\BudgetController;
use App\Http\Controllers\Api\SavingsGoalController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\InsightController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\ChatbotController;
use Illuminate\Support\Facades\Route;

// Public Auth routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Protected routes (Sanctum)
Route::middleware('auth:sanctum')->group(function () {
    // Auth profile
    Route::get('/user', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/user/profile', [AuthController::class, 'updateProfile']);
    Route::put('/user/password', [AuthController::class, 'updatePassword']);
    Route::put('/user/language', [AuthController::class, 'updateLanguage']);

    // Settings
    Route::get('/settings', [SettingController::class, 'show']);
    Route::put('/settings', [SettingController::class, 'update']);

    // Analytics & Dashboard
    Route::get('/analytics/dashboard', [AnalyticsController::class, 'dashboard']);
    Route::get('/analytics/charts', [AnalyticsController::class, 'charts']);

    // Insights
    Route::get('/insights', [InsightController::class, 'index']);
    Route::post('/insights/refresh', [InsightController::class, 'refresh']);
    Route::post('/insights/analyze', [InsightController::class, 'analyze']);
    Route::put('/insights/{insight}/read', [InsightController::class, 'markAsRead']);
    Route::delete('/insights/{insight}', [InsightController::class, 'destroy']);

    // Financial Modules CRUD
    Route::apiResource('categories', CategoryController::class);
    Route::apiResource('incomes', IncomeController::class);
    Route::get('expenses/breakdown', [ExpenseController::class, 'breakdown']);
    Route::apiResource('expenses', ExpenseController::class);
    Route::apiResource('budgets', BudgetController::class);
    
    // Savings goals
    Route::apiResource('savings-goals', SavingsGoalController::class)
        ->parameters(['savings-goals' => 'savingsGoal']);
    Route::post('savings-goals/{savingsGoal}/contribute', [SavingsGoalController::class, 'contribute']);

    // Chatbot
    Route::get('/chat/sessions', [ChatbotController::class, 'sessions']);
    Route::post('/chat/sessions', [ChatbotController::class, 'createSession']);
    Route::get('/chat/sessions/{chatSession}', [ChatbotController::class, 'showSession']);
    Route::delete('/chat/sessions/{chatSession}', [ChatbotController::class, 'deleteSession']);
    Route::post('/chatbot', [ChatbotController::class, 'sendMessage']);
    Route::post('/chat', [ChatbotController::class, 'sendMessage']);
});
